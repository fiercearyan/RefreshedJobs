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

/** Where the sweep of the company list has reached. */
export interface HighPayProgress {
  /** Scan units (company batch × location) already covered this sweep. */
  swept: number;
  /** Total units in a full sweep of the selected companies. */
  totalUnits: number;
  /** Company names covered this sweep, and in total. */
  namesDone: number;
  totalNames: number;
  companies: number;
}

/**
 * One reply from the scan endpoint. The board starts runs (POST) and then polls
 * (GET) until `pending` reaches zero — Apify's LinkedIn runs are far too slow to
 * wait for inside a single request.
 */
export interface HighPayScanResponse {
  jobs: HighPayJob[];
  refreshedAt: string | null;
  config?: HighPayConfig;
  /** Apify runs started by this call (POST only). */
  started?: number;
  /** Runs still in flight — keep polling while this is > 0. */
  pending: number;
  progress: HighPayProgress;
  /** Jobs new to the board from runs collected by this call. */
  added?: number;
  /** Postings pulled / kept by runs collected by this call. */
  raw?: number;
  matched?: number;
  /** True when the whole selected company list has been swept. */
  sweepComplete?: boolean;
  error?: string;
  code?: string;
}
