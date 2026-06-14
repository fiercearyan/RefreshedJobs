import type { RefreshResponse } from "./types";

/**
 * In-memory cache of the most recent /api/refresh result.
 *
 * This is a module-level variable, so it lives as long as the serverless
 * instance stays warm. It is enough for v1: the first page load serves this
 * immediately (no blank screen) and the Refresh button pulls fresh data.
 * It does NOT survive cold starts — see the README for the Vercel KV upgrade
 * path if you want the snapshot to persist across instances.
 *
 * `globalThis` keeps a single instance across HMR reloads in dev.
 */
const g = globalThis as unknown as { __jobCache?: RefreshResponse | null };

export function getCachedJobs(): RefreshResponse | null {
  return g.__jobCache ?? null;
}

export function setCachedJobs(data: RefreshResponse): void {
  g.__jobCache = data;
}
