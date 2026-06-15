import type { ApifyJob } from "./types";
import { FRESHNESS_SECONDS, type RoleSearch, type SearchConfig } from "./searchConfig";

const ACTOR = "valig~linkedin-jobs-scraper";
const ENDPOINT = `https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items`;

/** Run one Apify search synchronously and return its dataset items. */
async function runSearch(
  token: string,
  role: RoleSearch,
  location: string,
  freshnessSeconds: number,
): Promise<ApifyJob[]> {
  const input = {
    title: role.title,
    location,
    limit: role.limit,
    // f_TPR = "posted within N seconds" — gives us 3h/6h/12h/24h/2d/3d/7d,
    // which the actor's built-in datePosted enum (24h/7d/30d) can't express.
    urlParam: [{ key: "f_TPR", value: `r${freshnessSeconds}` }],
  };

  const res = await fetch(`${ENDPOINT}?token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Apify search "${role.title}" failed: ${res.status} ${res.statusText} ${body.slice(0, 200)}`,
    );
  }

  const data = (await res.json()) as unknown;
  return Array.isArray(data) ? (data as ApifyJob[]) : [];
}

/**
 * Run every role search in the user's config in parallel. Uses allSettled so one
 * failing search doesn't sink the whole refresh — we return whatever succeeded.
 */
export async function runSearches(token: string, config: SearchConfig): Promise<ApifyJob[]> {
  const seconds = FRESHNESS_SECONDS[config.freshness];
  const results = await Promise.allSettled(
    config.roles.map((role) => runSearch(token, role, config.location, seconds)),
  );

  const merged: ApifyJob[] = [];
  const errors: string[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") merged.push(...r.value);
    else errors.push(r.reason instanceof Error ? r.reason.message : String(r.reason));
  }

  if (merged.length === 0 && errors.length > 0) {
    throw new Error(errors.join(" | "));
  }
  return merged;
}
