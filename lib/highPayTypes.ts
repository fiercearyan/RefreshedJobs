import type { Job } from "./types";
import type { HighPayCat, HighPayTier } from "./highPayCompanies";
import type { HighPayConfig } from "./highPayConfig";

/** A normal scored Job plus the High Pay Radar metadata for its employer. */
export interface HighPayJob extends Job {
  hp: {
    n: string; // High Pay Radar company name
    p: string; // pay band label, e.g. "₹45–75L"
    t: HighPayTier; // 1 / 2 / 3
    cat: HighPayCat; // sector
    u: string; // careers page
  };
}

export interface HighPayRefreshResponse {
  jobs: HighPayJob[];
  refreshedAt: string;
  config?: HighPayConfig;
  /** How the pull went — surfaced in the board's subtitle. */
  stats?: {
    companies: number; // companies in scope after tier/sector selection
    totalNames: number; // company names in scope (incl. parent-brand aliases)
    namesScanned: number; // names actually covered by this refresh
    coveredFrom: number; // 1-based position in the rotation this scan started at
    batches: number; // Apify runs attempted
    batchesOk: number; // runs that came back in time
    raw: number; // raw LinkedIn items fetched
    matched: number; // items that resolved to a high-pay company
    added: number; // jobs new to the board this scan
    total: number; // jobs on the board after merging with the last snapshot
    fallback: boolean; // true if the broad-search fallback was used
    partial: boolean; // true if some batches timed out / failed
    concurrencyHit: boolean; // true if Apify's concurrent-run cap was hit
  };
  error?: string;
}
