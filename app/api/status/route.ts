import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserByEmail, users } from "@/lib/users";
import type { Job } from "@/lib/types";

export const dynamic = "force-dynamic";

// Return the user's saved statuses as two maps the client can use directly:
//   status:  { [url]: "applied" | "notinterested" }
//   archive: { [url]: Job }
export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await getUserByEmail(email);
  const status: Record<string, "applied" | "saved" | "notinterested"> = {};
  const archive: Record<string, Job> = {};
  const at: Record<string, number> = {};
  const notifReadAt: Record<string, number> = {};
  for (const e of user?.jobStatus ?? []) {
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

  const col = await users();
  // Remove any existing entry for this URL first.
  await col.updateOne({ email }, { $pull: { jobStatus: { url } } }, { upsert: true });
  // Then add the new one (unless clearing).
  if (body.status && body.job) {
    await col.updateOne(
      { email },
      { $push: { jobStatus: { url, status: body.status, job: body.job, at: Date.now() } } },
    );
  }

  return NextResponse.json({ ok: true });
}
