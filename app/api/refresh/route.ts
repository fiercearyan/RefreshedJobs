import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserByEmail } from "@/lib/users";
import { decrypt } from "@/lib/crypto";
import { runSearches } from "@/lib/apify";
import { normalizeJobs } from "@/lib/normalize";
import { getCachedJobs, setCachedJobs } from "@/lib/cache";
import { DEFAULT_CONFIG, sanitizeConfig } from "@/lib/searchConfig";
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

  // Require a signed-in user.
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Please sign in to refresh." }, { status: 401 });
  }

  // One read for both the user's Apify key and their saved search config.
  let token: string | undefined;
  let config = DEFAULT_CONFIG;
  try {
    const user = await getUserByEmail(email);
    if (user?.apifyKeyEnc) token = decrypt(user.apifyKeyEnc);
    // sanitize migrates older single-location configs to the new shape
    if (user?.searchConfig) config = sanitizeConfig(user.searchConfig);
  } catch {
    /* fall back below */
  }
  // Prefer the user's own key; fall back to the shared server token.
  if (!token) token = process.env.APIFY_TOKEN;

  if (!token) {
    return NextResponse.json(
      {
        error:
          "No Apify key available. Add your own key in your profile to refresh.",
        code: "NO_APIFY_KEY",
      },
      { status: 400 },
    );
  }

  try {
    const raw = await runSearches(token, config);
    const jobs = normalizeJobs(raw);
    const payload: RefreshResponse = {
      jobs,
      refreshedAt: new Date().toISOString(),
      config,
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
