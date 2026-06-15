import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { clearUserJob, getUserJobs, setUserJob } from "@/lib/userJobs";
import type { Job } from "@/lib/types";

export const dynamic = "force-dynamic";

// Return the user's filed jobs as maps the client can use directly:
//   status:  { [url]: "applied" | "saved" | "notinterested" }
//   archive: { [url]: Job }
//   at:      { [url]: epoch ms filed }
//   notifReadAt: { [url]: epoch ms reminder last read }
export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await getUserJobs(email); // migrates legacy embedded data on first read
  const status: Record<string, "applied" | "saved" | "notinterested"> = {};
  const archive: Record<string, Job> = {};
  const at: Record<string, number> = {};
  const notifReadAt: Record<string, number> = {};
  for (const e of rows) {
    status[e.url] = e.status;
    archive[e.url] = e.job;
    at[e.url] = e.at ?? 0;
    if (e.notifReadAt) notifReadAt[e.url] = e.notifReadAt;
  }
  return NextResponse.json({ status, archive, at, notifReadAt });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { url?: string; status?: "" | "applied" | "saved" | "notinterested"; job?: Job };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const url = (body.url ?? "").trim();
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  if (body.status && body.job) {
    await setUserJob(email, url, body.status, body.job);
  } else {
    await clearUserJob(email, url);
  }

  return NextResponse.json({ ok: true });
}
