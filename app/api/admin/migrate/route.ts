import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { migrateAllUsers } from "@/lib/userJobs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// One-shot migration of every user's embedded jobStatus[] into the userJobs
// collection. Idempotent — safe to hit more than once. Requires a signed-in
// user; if MIGRATE_SECRET is set, also requires ?token=<MIGRATE_SECRET>.
async function run(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const secret = process.env.MIGRATE_SECRET;
  if (secret) {
    const token = new URL(req.url).searchParams.get("token");
    if (token !== secret) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await migrateAllUsers();
  return NextResponse.json({ ok: true, ...result });
}

export async function POST(req: Request) {
  return run(req);
}
// GET allowed too, so it can be triggered from a browser address bar.
export async function GET(req: Request) {
  return run(req);
}
