import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { markNotifRead } from "@/lib/userJobs";

export const dynamic = "force-dynamic";

// Mark the saved-job notifications for the given URLs as read (now). The next
// notification for each fires 12h after this, as long as the job stays saved.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { urls?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const urls = Array.isArray(body.urls) ? body.urls.filter((u) => typeof u === "string" && u) : [];
  await markNotifRead(email, urls);

  return NextResponse.json({ ok: true });
}
