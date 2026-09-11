import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserByEmail } from "@/lib/users";
import { decrypt } from "@/lib/crypto";
import { runHighPaySearches } from "@/lib/highPayApify";
import { normalizeHighPayJobs } from "@/lib/highPayNormalize";
import { getCachedHighPayJobs, setCachedHighPayJobs } from "@/lib/highPayCache";
import { DEFAULT_HIGH_PAY_CONFIG, sanitizeHighPayConfig } from "@/lib/highPayConfig";
import { getHighPayUser, saveHighPaySnapshot } from "@/lib/highPayUser";
import type { HighPayRefreshResponse } from "@/lib/highPayTypes";

// Several Apify runs fire in parallel; the lib keeps a 52s internal deadline.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

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
  try {
    const [user, hpUser] = await Promise.all([getUserByEmail(email), getHighPayUser(email)]);
    if (user?.apifyKeyEnc) token = decrypt(user.apifyKeyEnc);
    if (hpUser?.highPayConfig) config = sanitizeHighPayConfig(hpUser.highPayConfig);
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
    const result = await runHighPaySearches(token, config);
    const jobs = normalizeHighPayJobs(result.raw);
    const refreshedAt = new Date().toISOString();

    const payload: HighPayRefreshResponse = {
      jobs,
      refreshedAt,
      config,
      stats: {
        companies: result.companies.length,
        batches: result.batches,
        batchesOk: result.batchesOk,
        raw: result.raw.length,
        matched: jobs.length,
        fallback: result.fallback,
        partial: result.batchesOk < result.batches,
      },
    };

    setCachedHighPayJobs(payload);
    try {
      await saveHighPaySnapshot(email, jobs, refreshedAt);
    } catch {
      /* non-fatal: the in-memory cache + client state still work */
    }

    if (result.errors.length && result.batchesOk > 0) {
      payload.error = `Some searches didn't finish: ${result.errors.slice(0, 2).join(" | ")}`;
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
