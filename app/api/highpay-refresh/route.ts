import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserByEmail } from "@/lib/users";
import { decrypt } from "@/lib/crypto";
import { runHighPaySearches } from "@/lib/highPayApify";
import { normalizeHighPayJobs } from "@/lib/highPayNormalize";
import { getCachedHighPayJobs, setCachedHighPayJobs } from "@/lib/highPayCache";
import { DEFAULT_HIGH_PAY_CONFIG, sanitizeHighPayConfig } from "@/lib/highPayConfig";
import { FRESHNESS_SECONDS } from "@/lib/searchConfig";
import { getHighPayUser, saveHighPaySnapshot } from "@/lib/highPayUser";
import type { HighPayJob, HighPayRefreshResponse } from "@/lib/highPayTypes";

// Several Apify runs fire per refresh; the lib keeps a 50s internal deadline.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Keep the board from growing without bound. */
const MAX_SNAPSHOT_JOBS = 400;

/**
 * A refresh only scans a slice of the company list, so results are merged into
 * the previous snapshot instead of replacing it: a fresh copy of a job wins,
 * and anything now older than the user's freshness window is dropped.
 */
function mergeJobs(
  previous: HighPayJob[],
  fresh: HighPayJob[],
  freshnessSeconds: number,
): { jobs: HighPayJob[]; added: number } {
  const cutoff = new Date(Date.now() - freshnessSeconds * 1000);
  // Postings carry a date, not a timestamp — allow the posting's own day.
  const cutoffDay = cutoff.toISOString().slice(0, 10);

  const byUrl = new Map<string, HighPayJob>();
  for (const j of previous) {
    if (!j?.url) continue;
    if (j.iso && j.iso < cutoffDay) continue; // aged out of the window
    byUrl.set(j.url, j);
  }

  let added = 0;
  for (const j of fresh) {
    if (!byUrl.has(j.url)) added++;
    byUrl.set(j.url, j); // fresh copy wins (newer score / applicant count)
  }

  const jobs = Array.from(byUrl.values())
    .sort((a, b) => b.hp.t - a.hp.t || b.score - a.score)
    .slice(0, MAX_SNAPSHOT_JOBS);

  return { jobs, added };
}

async function handleRefresh(): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Please sign in to refresh." }, { status: 401 });
  }

  // Same per-user Apify key as the normal board, with the shared server token
  // as fallback. The High Pay board only adds its own search config on top.
  let token: string | undefined;
  let config = DEFAULT_HIGH_PAY_CONFIG;
  let cursor = 0;
  let previous: HighPayJob[] = [];
  try {
    const [user, hpUser] = await Promise.all([getUserByEmail(email), getHighPayUser(email)]);
    if (user?.apifyKeyEnc) token = decrypt(user.apifyKeyEnc);
    if (hpUser?.highPayConfig) config = sanitizeHighPayConfig(hpUser.highPayConfig);
    if (typeof hpUser?.highPayCursor === "number") cursor = hpUser.highPayCursor;
    if (hpUser?.highPaySnapshot?.jobs?.length) previous = hpUser.highPaySnapshot.jobs;
  } catch {
    /* fall through to the env token / defaults */
  }
  if (!token) token = process.env.APIFY_TOKEN;

  if (!token) {
    return NextResponse.json(
      {
        error: "No Apify key available. Add your own key in your profile to refresh.",
        code: "NO_APIFY_KEY",
      },
      { status: 400 },
    );
  }

  try {
    const result = await runHighPaySearches(token, config, cursor);
    const fresh = normalizeHighPayJobs(result.raw);
    const { jobs, added } = mergeJobs(previous, fresh, FRESHNESS_SECONDS[config.freshness]);
    const refreshedAt = new Date().toISOString();

    const payload: HighPayRefreshResponse = {
      jobs,
      refreshedAt,
      config,
      stats: {
        companies: result.companies.length,
        totalNames: result.totalNames,
        namesScanned: result.namesScanned,
        coveredFrom: result.startIndex * config.batchSize + 1,
        batches: result.batches,
        batchesOk: result.batchesOk,
        raw: result.raw.length,
        matched: fresh.length,
        added,
        total: jobs.length,
        fallback: result.fallback,
        partial: result.batchesOk < result.batches,
        concurrencyHit: result.concurrencyHit,
      },
    };

    setCachedHighPayJobs(payload);
    try {
      await saveHighPaySnapshot(email, jobs, refreshedAt, result.nextIndex);
    } catch {
      /* non-fatal: the in-memory cache + client state still work */
    }

    // Only surface errors that actually cost us something.
    if (result.errors.length && result.batchesOk === 0) {
      payload.error = result.concurrencyHit
        ? "Apify wouldn't start the runs — its concurrent-run limit (5 on the free plan) was already busy. Wait a few seconds and scan again, or lower “Runs at once” in Settings."
        : `Searches didn't finish: ${result.errors.slice(0, 2).join(" | ")}`;
    }
    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const cached = getCachedHighPayJobs();
    if (cached) {
      return NextResponse.json(
        { ...cached, error: `Refresh failed, showing last snapshot. (${message})` },
        { status: 200 },
      );
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function POST() {
  return handleRefresh();
}

export async function GET() {
  return handleRefresh();
}
