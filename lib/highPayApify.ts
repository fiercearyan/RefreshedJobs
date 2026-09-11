import type { ApifyJob } from "./types";
import { FRESHNESS_SECONDS } from "./searchConfig";
import type { HighPayConfig } from "./highPayConfig";
import { chunk, searchNames, selectCompanies, type HighPayCompany } from "./highPayCompanies";

// Same actor as the normal board — we only support LinkedIn jobs.
const ACTOR = "valig~linkedin-jobs-scraper";
const ENDPOINT = `https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items`;

/** Leave headroom inside Vercel's 60s budget so we always answer with something. */
export const DEADLINE_MS = 50_000;
/** Don't start another run unless there's a realistic chance it finishes. */
const MIN_RUN_MS = 13_000;
/** Cap on a single run, so one slow batch can't eat the whole window. */
const RUN_TIMEOUT_MS = 38_000;
/** Apify free plans cap concurrent Actor runs (5). Back off and retry once. */
const CONCURRENCY_BACKOFF_MS = 5_000;

interface BatchInput {
  location: string;
  names: string[] | null; // null = broad fallback search (no company filter)
}

function isConcurrencyError(message: string): boolean {
  return /concurrent-runs-limit-exceeded|concurrent Actor runs/i.test(message);
}

/** One Apify run: company-scoped LinkedIn search for a batch of employers. */
async function runOnce(
  token: string,
  batch: BatchInput,
  config: HighPayConfig,
  deadline: number,
): Promise<ApifyJob[]> {
  const seconds = FRESHNESS_SECONDS[config.freshness];

  const input: Record<string, unknown> = {
    location: batch.location,
    limit: config.limit,
    // f_TPR = "posted within N seconds" — finer than the actor's datePosted enum.
    urlParam: [{ key: "f_TPR", value: `r${seconds}` }],
    // Keep the pull on-role; the actor filters titles case-insensitively and
    // ignores word order, so "Backend Engineer" also catches "Engineer, Backend".
    titleInclude: config.titles,
  };
  if (config.keywords) input.keywords = config.keywords;
  if (batch.names && batch.names.length) input.companyName = batch.names;

  const budget = Math.min(RUN_TIMEOUT_MS, deadline - Date.now());
  if (budget <= 2_000) throw new Error("skipped: out of time");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), budget);
  try {
    const res = await fetch(`${ENDPOINT}?token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`${res.status} ${res.statusText} ${body.slice(0, 300)}`);
    }

    const data = (await res.json()) as unknown;
    return Array.isArray(data) ? (data as ApifyJob[]) : [];
  } finally {
    clearTimeout(timer);
  }
}

/** runOnce + one polite retry when Apify says we're at the concurrent-run cap. */
async function runBatch(
  token: string,
  batch: BatchInput,
  config: HighPayConfig,
  deadline: number,
): Promise<ApifyJob[]> {
  try {
    return await runOnce(token, batch, config, deadline);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!isConcurrencyError(msg)) throw err;
    if (Date.now() + CONCURRENCY_BACKOFF_MS + MIN_RUN_MS > deadline) {
      throw new Error("Apify concurrent-run limit reached (another run is still going)");
    }
    await new Promise((r) => setTimeout(r, CONCURRENCY_BACKOFF_MS));
    return runOnce(token, batch, config, deadline);
  }
}

export interface HighPayFetchResult {
  raw: ApifyJob[];
  companies: HighPayCompany[];
  /** Total company names in scope (radar names + parent-brand aliases). */
  totalNames: number;
  /** Names actually covered by the searches that came back this refresh. */
  namesScanned: number;
  batches: number; // runs attempted
  batchesOk: number; // runs that returned in time
  startIndex: number; // rotation cursor this refresh started at
  nextIndex: number; // where the next refresh should pick up
  wrapped: boolean; // true when this refresh completed a full loop of the list
  fallback: boolean;
  errors: string[];
  concurrencyHit: boolean;
}

/**
 * Fetch LinkedIn jobs restricted to the High Pay Radar company list.
 *
 * The list is far too long to scan inside one 60s serverless request, and Apify
 * free plans only allow a handful of concurrent Actor runs — so each refresh
 * scans a *slice* of the list (small batches, bounded concurrency) starting
 * where the previous refresh stopped, and the route merges the results into the
 * saved snapshot. A few refreshes cover everything; one refresh never stalls.
 */
export async function runHighPaySearches(
  token: string,
  config: HighPayConfig,
  startIndex = 0,
): Promise<HighPayFetchResult> {
  const deadline = Date.now() + DEADLINE_MS;
  const companies = selectCompanies(config.tiers, config.cats);
  const names = searchNames(companies);
  const groups = chunk(names, config.batchSize);

  // One work unit = one company batch × one location, laid out in a stable
  // order so the rotation cursor means the same thing across refreshes.
  const units: BatchInput[] = [];
  for (const g of groups) {
    for (const location of config.locations) units.push({ location, names: g });
  }

  const start = units.length ? ((startIndex % units.length) + units.length) % units.length : 0;
  const planned = Math.min(config.maxBatches, units.length);

  const raw: ApifyJob[] = [];
  const errors: string[] = [];
  let batchesOk = 0;
  let attempted = 0;
  let namesScanned = 0;
  let concurrencyHit = false;
  let next = 0; // offset (from start) of the first unit NOT taken by a worker

  const take = () => {
    if (next >= planned) return null;
    if (Date.now() > deadline - MIN_RUN_MS) return null;
    const offset = next++;
    return { offset, unit: units[(start + offset) % units.length] };
  };

  async function worker() {
    for (;;) {
      const job = take();
      if (!job) return;
      attempted++;
      try {
        const items = await runBatch(token, job.unit, config, deadline);
        batchesOk++;
        namesScanned += job.unit.names?.length ?? 0;
        raw.push(...items);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (isConcurrencyError(msg)) concurrencyHit = true;
        errors.push(
          /abort|out of time|skipped/i.test(msg)
            ? "a company batch ran out of time"
            : isConcurrencyError(msg)
              ? "Apify's concurrent-run limit was hit"
              : msg.slice(0, 160),
        );
      }
    }
  }

  const lanes = Math.max(1, Math.min(config.concurrency, planned));
  await Promise.all(Array.from({ length: lanes }, () => worker()));

  // Nothing at all came back and the user allows it: one broad search, filtered
  // to high-pay employers locally. Costs one extra run, only on empty days.
  let fallback = false;
  if (raw.length === 0 && config.fallbackBroad && Date.now() < deadline - MIN_RUN_MS) {
    fallback = true;
    try {
      raw.push(
        ...(await runBatch(token, { location: config.locations[0], names: null }, config, deadline)),
      );
    } catch (err) {
      errors.push(err instanceof Error ? err.message.slice(0, 160) : String(err));
    }
  }

  if (raw.length === 0 && batchesOk === 0 && errors.length > 0) {
    throw new Error(Array.from(new Set(errors)).slice(0, 2).join(" | "));
  }

  const consumed = attempted; // where the next refresh should resume
  const nextIndex = units.length ? (start + consumed) % units.length : 0;

  return {
    raw,
    companies,
    totalNames: names.length,
    namesScanned,
    batches: attempted,
    batchesOk,
    startIndex: start,
    nextIndex,
    wrapped: consumed >= units.length,
    fallback,
    errors: Array.from(new Set(errors)),
    concurrencyHit,
  };
}
