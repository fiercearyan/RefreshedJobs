import type { ApifyJob } from "./types";
import { FRESHNESS_SECONDS } from "./searchConfig";
import type { HighPayConfig } from "./highPayConfig";
import {
  chunk,
  searchNames,
  selectCompanies,
  type HighPayCompany,
} from "./highPayCompanies";

// Same actor as the normal board — we only support LinkedIn jobs.
const ACTOR = "valig~linkedin-jobs-scraper";
const ENDPOINT = `https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items`;

/** Leave headroom inside Vercel's 60s budget so we always answer with something. */
export const DEADLINE_MS = 52_000;

interface BatchInput {
  location: string;
  names: string[] | null; // null = broad fallback search (no company filter)
}

/** One Apify run: company-scoped LinkedIn search for a batch of employers. */
async function runBatch(
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

  const left = deadline - Date.now();
  if (left <= 2_000) return [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), left);
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
      const who = batch.names ? `${batch.names.length} companies` : "broad search";
      throw new Error(
        `High-pay search (${who}) failed: ${res.status} ${res.statusText} ${body.slice(0, 160)}`,
      );
    }

    const data = (await res.json()) as unknown;
    return Array.isArray(data) ? (data as ApifyJob[]) : [];
  } finally {
    clearTimeout(timer);
  }
}

export interface HighPayFetchResult {
  raw: ApifyJob[];
  companies: HighPayCompany[];
  batches: number;
  batchesOk: number;
  fallback: boolean;
  errors: string[];
}

/**
 * Fetch LinkedIn jobs restricted to the High Pay Radar company list.
 *
 * The company list is split into batches (default 35 names) and each batch runs
 * as one Apify search with the actor's `companyName` filter, in parallel, under
 * a shared deadline. Whatever comes back in time is returned — a slow or failed
 * batch never sinks the refresh.
 */
export async function runHighPaySearches(
  token: string,
  config: HighPayConfig,
): Promise<HighPayFetchResult> {
  const deadline = Date.now() + DEADLINE_MS;
  const companies = selectCompanies(config.tiers, config.cats);
  const names = searchNames(companies);

  // Spread the company batches across the chosen locations without blowing the
  // run budget: batches are capped by maxBatches in total.
  const groups = chunk(names, config.batchSize);
  const planned: BatchInput[] = [];
  for (const location of config.locations) {
    for (const g of groups) planned.push({ location, names: g });
  }
  const batches = planned.slice(0, config.maxBatches);

  const settled = await Promise.allSettled(
    batches.map((b) => runBatch(token, b, config, deadline)),
  );

  const raw: ApifyJob[] = [];
  const errors: string[] = [];
  let batchesOk = 0;
  for (const r of settled) {
    if (r.status === "fulfilled") {
      batchesOk++;
      raw.push(...r.value);
    } else {
      const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
      errors.push(msg.includes("abort") ? "a company batch timed out" : msg);
    }
  }

  // Nothing at all came back and the user allows it: one broad search, filtered
  // down to high-pay employers locally. Costs one extra run, only on empty days.
  let fallback = false;
  if (raw.length === 0 && config.fallbackBroad && Date.now() < deadline - 5_000) {
    fallback = true;
    const broad = await Promise.allSettled(
      config.locations.map((location) =>
        runBatch(token, { location, names: null }, config, deadline),
      ),
    );
    for (const r of broad) {
      if (r.status === "fulfilled") raw.push(...r.value);
      else errors.push(r.reason instanceof Error ? r.reason.message : String(r.reason));
    }
  }

  if (raw.length === 0 && errors.length > 0 && batchesOk === 0) {
    throw new Error(errors.slice(0, 2).join(" | "));
  }

  return {
    raw,
    companies,
    batches: batches.length,
    batchesOk,
    fallback,
    errors,
  };
}
