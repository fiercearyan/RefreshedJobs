// ---- High Pay board search configuration ----
// Completely separate from lib/searchConfig.ts (which drives the normal board).
// Saved per user in MongoDB under `highPayConfig`.

import { FRESHNESS_SECONDS, type Freshness } from "./searchConfig";
import {
  ALL_CATS,
  ALL_TIERS,
  type HighPayCat,
  type HighPayTier,
} from "./highPayCompanies";

export interface HighPayConfig {
  locations: string[]; // 1–2 locations
  freshness: Freshness; // posted-within window
  /** Title phrases handed to the actor's titleInclude filter. */
  titles: string[];
  /** Optional extra LinkedIn keyword (kept empty by default). */
  keywords: string;
  tiers: HighPayTier[]; // which pay bands to include
  cats: HighPayCat[]; // which sectors to include
  batchSize: number; // companies per Apify run
  limit: number; // result cap per Apify run
  maxBatches: number; // hard cap on Apify runs per refresh
  /** How many Apify runs may be in flight at once. Apify free plans allow 5
   *  concurrent Actor runs in total, so keep headroom for the normal board. */
  concurrency: number;
  /** If the company-scoped search returns nothing, retry once without the
   *  company filter and keep only high-pay companies locally. */
  fallbackBroad: boolean;
}

export const MAX_HP_LOCATIONS = 2;
export const MAX_HP_TITLES = 6;
export const MAX_HP_TITLE_LEN = 60;
export const MAX_HP_LOCATION_LEN = 80;

export const HP_BATCH_MIN = 5;
export const HP_BATCH_MAX = 40;
export const HP_LIMIT_MIN = 10;
export const HP_LIMIT_MAX = 200;
export const HP_MAX_BATCHES_MIN = 1;
export const HP_MAX_BATCHES_MAX = 20;
export const HP_CONCURRENCY_MIN = 1;
export const HP_CONCURRENCY_MAX = 5;

export const DEFAULT_HIGH_PAY_CONFIG: HighPayConfig = {
  locations: ["India"],
  // Top-paying companies post far less often than the market at large, so the
  // default window is deliberately wider than the normal board's.
  freshness: "7d",
  titles: [
    "Backend Engineer",
    "Software Engineer",
    "Senior Software Engineer",
    "Platform Engineer",
    "Software Development Engineer",
  ],
  keywords: "",
  tiers: [...ALL_TIERS],
  cats: [...ALL_CATS],
  // Small batches finish inside the request window; the scan rotates through
  // the company list across refreshes rather than trying to do it all at once.
  batchSize: 12,
  limit: 60,
  maxBatches: 8,
  concurrency: 3,
  fallbackBroad: true,
};

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** Clamp/validate arbitrary input into a safe HighPayConfig (server authority). */
export function sanitizeHighPayConfig(input: unknown): HighPayConfig {
  const obj = (input ?? {}) as Record<string, unknown>;
  const d = DEFAULT_HIGH_PAY_CONFIG;

  const seenLoc = new Set<string>();
  let locations = (Array.isArray(obj.locations) ? obj.locations : [])
    .map((l) => (typeof l === "string" ? l.trim().slice(0, MAX_HP_LOCATION_LEN) : ""))
    .filter((l) => l.length > 0)
    .filter((l) => {
      const k = l.toLowerCase();
      if (seenLoc.has(k)) return false;
      seenLoc.add(k);
      return true;
    })
    .slice(0, MAX_HP_LOCATIONS);
  if (locations.length === 0) locations = [...d.locations];

  const freshness: Freshness =
    typeof obj.freshness === "string" && obj.freshness in FRESHNESS_SECONDS
      ? (obj.freshness as Freshness)
      : d.freshness;

  const seenTitle = new Set<string>();
  let titles = (Array.isArray(obj.titles) ? obj.titles : [])
    .map((t) => (typeof t === "string" ? t.trim().slice(0, MAX_HP_TITLE_LEN) : ""))
    .filter((t) => t.length > 0)
    .filter((t) => {
      const k = t.toLowerCase();
      if (seenTitle.has(k)) return false;
      seenTitle.add(k);
      return true;
    })
    .slice(0, MAX_HP_TITLES);
  if (titles.length === 0) titles = [...d.titles];

  const keywords = typeof obj.keywords === "string" ? obj.keywords.trim().slice(0, 80) : "";

  const rawTiers = Array.isArray(obj.tiers) ? obj.tiers : [];
  let tiers = ALL_TIERS.filter((t) => rawTiers.includes(t));
  if (tiers.length === 0) tiers = [...d.tiers];

  const rawCats = Array.isArray(obj.cats) ? obj.cats : [];
  let cats = ALL_CATS.filter((c) => rawCats.includes(c));
  if (cats.length === 0) cats = [...d.cats];

  return {
    locations,
    freshness,
    titles,
    keywords,
    tiers,
    cats,
    batchSize: clampInt(obj.batchSize, HP_BATCH_MIN, HP_BATCH_MAX, d.batchSize),
    limit: clampInt(obj.limit, HP_LIMIT_MIN, HP_LIMIT_MAX, d.limit),
    maxBatches: clampInt(obj.maxBatches, HP_MAX_BATCHES_MIN, HP_MAX_BATCHES_MAX, d.maxBatches),
    concurrency: clampInt(obj.concurrency, HP_CONCURRENCY_MIN, HP_CONCURRENCY_MAX, d.concurrency),
    fallbackBroad: obj.fallbackBroad === undefined ? d.fallbackBroad : Boolean(obj.fallbackBroad),
  };
}
