import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Public diagnostic: reports WHICH env vars the running deployment can see
// (booleans only — never the secret values). Visit /api/health after deploying
// to confirm Vercel is injecting your environment variables.
export async function GET() {
  return NextResponse.json({
    NEXTAUTH_SECRET: Boolean(process.env.NEXTAUTH_SECRET),
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? null, // not secret — shown to verify it matches your domain
    MONGODB_URI: Boolean(process.env.MONGODB_URI),
    GOOGLE_CLIENT_ID: Boolean(process.env.GOOGLE_CLIENT_ID),
    GOOGLE_CLIENT_SECRET: Boolean(process.env.GOOGLE_CLIENT_SECRET),
    ENCRYPTION_SECRET: Boolean(process.env.ENCRYPTION_SECRET),
    APIFY_TOKEN: Boolean(process.env.APIFY_TOKEN),
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV ?? null,
  });
}
