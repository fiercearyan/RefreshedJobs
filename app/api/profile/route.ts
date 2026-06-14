import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserByEmail, users } from "@/lib/users";
import { encrypt, maskHint } from "@/lib/crypto";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await getUserByEmail(email);
  return NextResponse.json({
    name: user?.name ?? session.user.name ?? null,
    email,
    image: user?.image ?? session.user.image ?? null,
    phone: user?.phone ?? null,
    hasApifyKey: Boolean(user?.apifyKeyEnc),
    apifyKeyHint: user?.apifyKeyHint ?? null,
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { phone?: string; apifyKey?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  const unset: Record<string, unknown> = {};

  if (typeof body.phone === "string") {
    const phone = body.phone.trim();
    if (phone) update.phone = phone;
    else unset.phone = "";
  }

  if (typeof body.apifyKey === "string") {
    const key = body.apifyKey.trim();
    if (key) {
      update.apifyKeyEnc = encrypt(key);
      update.apifyKeyHint = maskHint(key);
    } else {
      // empty string => clear the saved key
      unset.apifyKeyEnc = "";
      unset.apifyKeyHint = "";
    }
  }

  const ops: Record<string, unknown> = {};
  if (Object.keys(update).length) ops.$set = update;
  if (Object.keys(unset).length) ops.$unset = unset;

  if (Object.keys(ops).length) {
    await (await users()).updateOne({ email }, ops, { upsert: true });
  }

  const user = await getUserByEmail(email);
  return NextResponse.json({
    ok: true,
    phone: user?.phone ?? null,
    hasApifyKey: Boolean(user?.apifyKeyEnc),
    apifyKeyHint: user?.apifyKeyHint ?? null,
  });
}
