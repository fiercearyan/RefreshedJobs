import type { ApifyJob } from "./types";

const ACTOR = "valig~linkedin-jobs-scraper";
const ENDPOINT = `https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items`;

// The four searches to run in parallel, per the spec.
export const SEARCHES: { title: string; limit: number }[] = [
  { title: "Backend Engineer", limit: 20 },
  { title: "Senior Software Engineer", limit: 20 },
  { title: "Platform Engineer", limit: 15 },
  { title: "Software Development Engineer", limit: 15 },
];

interface SearchInput {
  title: string;
  limit: number;
  location?: string;
  datePosted?: string;
}

/** Run one Apify search synchronously and return its dataset items. */
async function runSearch(
  token: string,
  { title, limit }: { title: string; limit: number },
): Promise<ApifyJob[]> {
  const input: SearchInput = {
    title,
    location: "India",
    datePosted: "r86400", // posted in the last 24h
    limit,
  };

  const res = await fetch(`${ENDPOINT}?token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    // Each Apify run can take a while; keep this uncached.
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Apify search "${title}" failed: ${res.status} ${res.statusText} ${body.slice(0, 200)}`,
    );
  }

  const data = (await res.json()) as unknown;
  return Array.isArray(data) ? (data as ApifyJob[]) : [];
}

/**
 * Run all four searches in parallel. Uses allSettled so one failing search
 * doesn't sink the whole refresh — we return whatever succeeded.
 */
export async function runAllSearches(token: string): Promise<ApifyJob[]> {
  const results = await Promise.allSettled(SEARCHES.map((s) => runSearch(token, s)));

  const merged: ApifyJob[] = [];
  const errors: string[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") merged.push(...r.value);
    else errors.push(r.reason instanceof Error ? r.reason.message : String(r.reason));
  }

  // Only throw if *every* search failed — partial data is still useful.
  if (merged.length === 0 && errors.length > 0) {
    throw new Error(errors.join(" | "));
  }
  return merged;
}
