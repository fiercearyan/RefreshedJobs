import { NextResponse } from "next/server";
import { runAllSearches } from "@/lib/apify";
import { normalizeJobs } from "@/lib/normalize";
import { getCachedJobs, setCachedJobs } from "@/lib/cache";
import type { RefreshResponse } from "@/lib/types";

// Apify runs can take 30–60s+. Allow the max on Vercel Hobby (Pro can raise to 300).
export const maxDuration = 60;
export const dynamic = "force-dynamic";

function unauthorized(req: Request): boolean {
  const secret = process.env.REFRESH_SECRET;
  if (!secret) return false; // protection disabled
  const url = new URL(req.url);
  const provided = url.searchParams.get("token") || req.headers.get("x-refresh-token");
  return provided !== secret;
}

async function handleRefresh(req: Request): Promise<NextResponse> {
  if (unauthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.APIFY_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "APIFY_TOKEN is not configured on the server." },
      { status: 500 },
    );
  }

  try {
    const raw = await runAllSearches(token);
    const jobs = normalizeJobs(raw);
    const payload: RefreshResponse = {
      jobs,
      refreshedAt: new Date().toISOString(),
    };
    setCachedJobs(payload);
    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    // If we have a cached snapshot, return it with a soft error rather than failing hard.
    const cached = getCachedJobs();
    if (cached) {
      return NextResponse.json(
        { ...cached, error: `Refresh failed, showing last snapshot. (${message})` },
        { status: 200 },
      );
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

// POST — invoked by the Refresh button.
export async function POST(req: Request) {
  return handleRefresh(req);
}

// GET — invoked by the Vercel Cron pre-warm job (and handy for manual testing).
export async function GET(req: Request) {
  return handleRefresh(req);
}
