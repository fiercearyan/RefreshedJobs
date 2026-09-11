import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserByEmail } from "@/lib/users";
import { decrypt } from "@/lib/crypto";
import { buildUnits, collectRuns, startRuns, type HighPayRun } from "@/lib/highPayApify";
import { normalizeHighPayJobs } from "@/lib/highPayNormalize";
import { DEFAULT_HIGH_PAY_CONFIG, sanitizeHighPayConfig } from "@/lib/highPayConfig";
import { FRESHNESS_SECONDS } from "@/lib/searchConfig";
import {
  getHighPayUser,
  saveHighPayScanState,
  saveHighPaySnapshot,
  type HighPayUserDoc,
} from "@/lib/highPayUser";
import type { HighPayJob, HighPayScanResponse } from "@/lib/highPayTypes";

// Nothing here waits on Apify — POST starts runs, GET collects finished ones.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Keep the board from growing without bound. */
const MAX_SNAPSHOT_JOBS = 400;

interface Loaded {
  email: string;
  token: string;
  user: HighPayUserDoc | null;
  config: ReturnType<typeof sanitizeHighPayConfig>;
}

async function load(): Promise<Loaded | NextResponse> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Please sign in to scan." }, { status: 401 });
  }

  let token: string | undefined;
  let user: HighPayUserDoc | null = null;
  let config = DEFAULT_HIGH_PAY_CONFIG;
  try {
    const [main, hp] = await Promise.all([getUserByEmail(email), getHighPayUser(email)]);
    if (main?.apifyKeyEnc) token = decrypt(main.apifyKeyEnc);
    user = hp;
    if (hp?.highPayConfig) config = sanitizeHighPayConfig(hp.highPayConfig);
  } catch {
    /* fall through to env token / defaults */
  }
  if (!token) token = process.env.APIFY_TOKEN;
  if (!token) {
    return NextResponse.json(
      {
        error: "No Apify key available. Add your own key in your profile to scan.",
        code: "NO_APIFY_KEY",
      },
      { status: 400 },
    );
  }
  return { email, token, user, config };
}

/**
 * Results arrive one run at a time, so they're merged into the saved snapshot
 * rather than replacing it: a fresh copy of a job wins, and anything now older
 * than the user's freshness window drops off.
 */
function mergeJobs(
  previous: HighPayJob[],
  fresh: HighPayJob[],
  freshnessSeconds: number,
): { jobs: HighPayJob[]; added: number } {
  const cutoffDay = new Date(Date.now() - freshnessSeconds * 1000).toISOString().slice(0, 10);
  const byUrl = new Map<string, HighPayJob>();
  for (const j of previous) {
    if (!j?.url) continue;
    if (j.iso && j.iso < cutoffDay) continue;
    byUrl.set(j.url, j);
  }
  let added = 0;
  for (const j of fresh) {
    if (!byUrl.has(j.url)) added++;
    byUrl.set(j.url, j);
  }
  const jobs = Array.from(byUrl.values())
    .sort((a, b) => b.hp.t - a.hp.t || b.score - a.score)
    .slice(0, MAX_SNAPSHOT_JOBS);
  return { jobs, added };
}

function progressOf(
  config: Loaded["config"],
  swept: number,
): HighPayScanResponse["progress"] {
  const { units, companies, names } = buildUnits(config);
  const perUnit = units.length ? names.length / units.length : 0;
  const done = Math.min(swept, units.length);
  return {
    swept: done,
    totalUnits: units.length,
    namesDone: Math.min(names.length, Math.round(done * perUnit)),
    totalNames: names.length,
    companies: companies.length,
  };
}

// ---------------------------------------------------------------------------
// POST — start the next wave of Apify runs and return straight away.
// ---------------------------------------------------------------------------
export async function POST() {
  const loaded = await load();
  if (loaded instanceof NextResponse) return loaded;
  const { email, token, user, config } = loaded;

  const existing: HighPayRun[] = user?.highPayRuns ?? [];
  const cursor = user?.highPayCursor ?? 0;
  let swept = user?.highPaySwept ?? 0;
  const { units } = buildUnits(config);

  // Starting a fresh sweep once the list has been covered.
  if (swept >= units.length) swept = 0;

  const capacity = Math.max(0, config.concurrency - existing.length);
  const remaining = Math.max(0, units.length - swept - existing.length);
  const toStart = Math.min(capacity, remaining || capacity);

  const result = await startRuns(token, config, cursor, toStart);
  const runs = [...existing, ...result.runs];

  try {
    await saveHighPayScanState(email, { runs, cursor: result.nextIndex, swept });
  } catch {
    /* non-fatal — the poll below will still see whatever we saved before */
  }

  const payload: HighPayScanResponse = {
    jobs: user?.highPaySnapshot?.jobs ?? [],
    refreshedAt: user?.highPaySnapshot?.refreshedAt ?? null,
    config,
    started: result.started,
    pending: runs.length,
    progress: progressOf(config, swept),
  };

  if (result.concurrencyHit && result.started === 0) {
    payload.error =
      "Apify wouldn't start a run — its concurrent-run limit (5 on the free plan) is busy. Wait for the current runs to finish, or lower “Runs at once” in Settings.";
  } else if (result.errors.length && result.started === 0) {
    payload.error = `Couldn't start the scan: ${result.errors.slice(0, 2).join(" | ")}`;
  }

  return NextResponse.json(payload);
}

// ---------------------------------------------------------------------------
// GET — collect whatever has finished, merge it in, report progress.
// ---------------------------------------------------------------------------
export async function GET() {
  const loaded = await load();
  if (loaded instanceof NextResponse) return loaded;
  const { email, token, user, config } = loaded;

  const tracked: HighPayRun[] = user?.highPayRuns ?? [];
  const previous: HighPayJob[] = user?.highPaySnapshot?.jobs ?? [];
  let swept = user?.highPaySwept ?? 0;
  const cursor = user?.highPayCursor ?? 0;
  const { units } = buildUnits(config);

  if (tracked.length === 0) {
    return NextResponse.json({
      jobs: previous,
      refreshedAt: user?.highPaySnapshot?.refreshedAt ?? null,
      config,
      pending: 0,
      progress: progressOf(config, swept),
      sweepComplete: swept >= units.length,
    } satisfies HighPayScanResponse);
  }

  const collected = await collectRuns(token, tracked);
  const fresh = normalizeHighPayJobs(collected.items);
  const { jobs, added } = mergeJobs(previous, fresh, FRESHNESS_SECONDS[config.freshness]);

  swept = Math.min(units.length, swept + collected.finished + collected.failed);
  const refreshedAt =
    collected.finished > 0 ? new Date().toISOString() : (user?.highPaySnapshot?.refreshedAt ?? null);

  try {
    await saveHighPayScanState(email, { runs: collected.stillRunning, cursor, swept });
    if (collected.finished > 0 && refreshedAt) {
      await saveHighPaySnapshot(email, jobs, refreshedAt);
    }
  } catch {
    /* non-fatal */
  }

  const payload: HighPayScanResponse = {
    jobs,
    refreshedAt,
    config,
    pending: collected.stillRunning.length,
    progress: progressOf(config, swept),
    added,
    raw: collected.items.length,
    matched: fresh.length,
    sweepComplete: collected.stillRunning.length === 0 && swept >= units.length,
  };
  if (collected.errors.length) payload.error = collected.errors.slice(0, 2).join(" | ");

  return NextResponse.json(payload);
}
