import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DEFAULT_HIGH_PAY_CONFIG, sanitizeHighPayConfig } from "@/lib/highPayConfig";
import { getHighPayUser, saveHighPayConfig } from "@/lib/highPayUser";
import { selectCompanies } from "@/lib/highPayCompanies";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await getHighPayUser(email);
  const config = user?.highPayConfig
    ? sanitizeHighPayConfig(user.highPayConfig)
    : DEFAULT_HIGH_PAY_CONFIG;
  return NextResponse.json({
    config,
    companies: selectCompanies(config.tiers, config.cats).length,
  });
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

  const config = sanitizeHighPayConfig(body);
  await saveHighPayConfig(email, config);

  return NextResponse.json({
    ok: true,
    config,
    companies: selectCompanies(config.tiers, config.cats).length,
  });
}
