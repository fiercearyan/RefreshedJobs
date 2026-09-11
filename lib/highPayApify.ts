import type { ApifyJob } from "./types";
import { FRESHNESS_SECONDS } from "./searchConfig";
import type { HighPayConfig } from "./highPayConfig";
import { chunk, searchNames, selectCompanies, type HighPayCompany } from "./highPayCompanies";

// Same actor as the normal board — we only support LinkedIn jobs.
const ACTOR = "valig~linkedin-jobs-scraper";
const BASE = "https://api.apify.com/v2";

/** Hard cap on an Apify run, so an abandoned run can't burn credits for hours. */
const RUN_TIMEOUT_SECS = 240;
/** A run we've been tracking longer than this is given up on (and aborted). */
export const RUN_GIVE_UP_MS = 5 * 60 * 1000;

/** One in-flight Apify run we're waiting on, stored on the user document. */
export interface HighPayRun {
  id: string; // Apify run id
  ds: string; // its default dataset id
  loc: string; // location this run covers
  names: number; // how many company names it covers
  at: number; // epoch ms when we started it
}

export interface HighPayUnit {
  location: string;
  names: string[];
}

/** The full scan plan: company batches × locations, in a stable order. */
export function buildUnits(config: HighPayConfig): {
  units: HighPayUnit[];
  companies: HighPayCompany[];
  names: string[];
} {
  const companies = selectCompanies(config.tiers, config.cats);
  const names = searchNames(companies);
  const groups = chunk(names, config.batchSize);
  const units: HighPayUnit[] = [];
  for (const g of groups) {
    for (const location of config.locations) units.push({ location, names: g });
  }
  return { units, companies, names };
}

function actorInput(unit: HighPayUnit, config: HighPayConfig): Record<string, unknown> {
  const seconds = FRESHNESS_SECONDS[config.freshness];
  const input: Record<string, unknown> = {
    location: unit.location,
    limit: config.limit,
    // f_TPR = "posted within N seconds" — finer than the actor's datePosted enum.
    urlParam: [{ key: "f_TPR", value: `r${seconds}` }],
    titleInclude: config.titles,
  };
  if (config.keywords) input.keywords = config.keywords;
  if (unit.names.length) input.companyName = unit.names;
  return input;
}

function isConcurrencyError(message: string): boolean {
  return /concurrent-runs-limit-exceeded|concurrent Actor runs/i.test(message);
}

async function apify(
  url: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init?.timeoutMs ?? 15_000);
  try {
    return await fetch(url, { ...init, cache: "no-store", signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export interface StartResult {
  runs: HighPayRun[];
  started: number;
  nextIndex: number;
  errors: string[];
  concurrencyHit: boolean;
}

/**
 * Kick off up to `count` Apify runs and return immediately.
 *
 * This is the key difference from the normal board: the LinkedIn actor often
 * needs well over a minute for a company-scoped search, which no serverless
 * request can wait for. So we START runs here, remember their ids, and collect
 * their datasets on later polls.
 */
export async function startRuns(
  token: string,
  config: HighPayConfig,
  startIndex: number,
  count: number,
): Promise<StartResult> {
  const { units } = buildUnits(config);
  if (units.length === 0 || count <= 0) {
    return { runs: [], started: 0, nextIndex: startIndex, errors: [], concurrencyHit: false };
  }

  const start = ((startIndex % units.length) + units.length) % units.length;
  const runs: HighPayRun[] = [];
  const errors: string[] = [];
  let concurrencyHit = false;
  let offset = 0;

  const url = `${BASE}/acts/${ACTOR}/runs?token=${encodeURIComponent(token)}&timeout=${RUN_TIMEOUT_SECS}`;

  for (; offset < Math.min(count, units.length); offset++) {
    const unit = units[(start + offset) % units.length];
    try {
      const res = await apify(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(actorInput(unit, config)),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        const msg = `${res.status} ${res.statusText} ${body.slice(0, 200)}`;
        if (isConcurrencyError(msg)) {
          concurrencyHit = true;
          break; // no point trying the rest of this wave
        }
        throw new Error(msg);
      }
      const json = (await res.json()) as {
        data?: { id?: string; defaultDatasetId?: string };
      };
      const id = json.data?.id;
      const ds = json.data?.defaultDatasetId;
      if (!id || !ds) throw new Error("Apify did not return a run id");
      runs.push({ id, ds, loc: unit.location, names: unit.names.length, at: Date.now() });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(/abort/i.test(msg) ? "Apify took too long to accept the run" : msg.slice(0, 160));
      break;
    }
  }

  return {
    runs,
    started: runs.length,
    // Only advance past the units we actually launched.
    nextIndex: units.length ? (start + runs.length) % units.length : 0,
    errors: Array.from(new Set(errors)),
    concurrencyHit,
  };
}

export interface CollectResult {
  items: ApifyJob[];
  stillRunning: HighPayRun[];
  finished: number; // runs that completed successfully this poll
  failed: number; // runs that failed / were aborted / timed out
  namesDone: number; // company names covered by runs that finished
  errors: string[];
}

/** Check each tracked run; pull the dataset of any that finished. */
export async function collectRuns(token: string, runs: HighPayRun[]): Promise<CollectResult> {
  const items: ApifyJob[] = [];
  const stillRunning: HighPayRun[] = [];
  const errors: string[] = [];
  let finished = 0;
  let failed = 0;
  let namesDone = 0;

  await Promise.all(
    runs.map(async (run) => {
      try {
        const res = await apify(
          `${BASE}/actor-runs/${run.id}?token=${encodeURIComponent(token)}`,
        );
        if (!res.ok) throw new Error(`status check failed (${res.status})`);
        const json = (await res.json()) as { data?: { status?: string } };
        const status = json.data?.status ?? "UNKNOWN";

        if (status === "READY" || status === "RUNNING" || status === "ABORTING") {
          if (Date.now() - run.at > RUN_GIVE_UP_MS) {
            failed++;
            errors.push("a search was taking too long and was stopped");
            void apify(`${BASE}/actor-runs/${run.id}/abort?token=${encodeURIComponent(token)}`, {
              method: "POST",
            }).catch(() => {});
          } else {
            stillRunning.push(run);
          }
          return;
        }

        if (status !== "SUCCEEDED") {
          failed++;
          errors.push(`a search ended as ${status.toLowerCase()}`);
          return;
        }

        const dsRes = await apify(
          `${BASE}/datasets/${run.ds}/items?token=${encodeURIComponent(token)}&clean=true&format=json`,
          { timeoutMs: 20_000 },
        );
        if (!dsRes.ok) throw new Error(`could not read results (${dsRes.status})`);
        const data = (await dsRes.json()) as unknown;
        if (Array.isArray(data)) items.push(...(data as ApifyJob[]));
        finished++;
        namesDone += run.names;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // Transient check failure — keep the run and try again next poll.
        if (Date.now() - run.at <= RUN_GIVE_UP_MS) stillRunning.push(run);
        else {
          failed++;
          errors.push(msg.slice(0, 160));
        }
      }
    }),
  );

  return {
    items,
    stillRunning,
    finished,
    failed,
    namesDone,
    errors: Array.from(new Set(errors)),
  };
}
