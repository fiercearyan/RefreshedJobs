import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserByEmail, users } from "@/lib/users";
import { DEFAULT_CONFIG, sanitizeConfig } from "@/lib/searchConfig";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await getUserByEmail(email);
  return NextResponse.json({ config: user?.searchConfig ?? DEFAULT_CONFIG });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // Server is the authority on caps/shape — never trust the client.
  const config = sanitizeConfig(body);
  await (await users()).updateOne({ email }, { $set: { searchConfig: config } }, { upsert: true });

  return NextResponse.json({ ok: true, config });
}
