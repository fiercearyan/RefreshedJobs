import type { HighPayRefreshResponse } from "./highPayTypes";

/**
 * In-memory cache of the most recent /api/highpay-refresh result — the High Pay
 * twin of lib/cache.ts, kept separate so the two boards can never overwrite each
 * other's snapshot. Lives as long as the serverless instance stays warm; the
 * durable copy is the per-user `highPaySnapshot` in MongoDB.
 */
const g = globalThis as unknown as { __highPayCache?: HighPayRefreshResponse | null };

export function getCachedHighPayJobs(): HighPayRefreshResponse | null {
  return g.__highPayCache ?? null;
}

export function setCachedHighPayJobs(data: HighPayRefreshResponse): void {
  g.__highPayCache = data;
}
