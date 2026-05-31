import { NextResponse } from "next/server";
import { generateTwoFactorCode } from "@/lib/services/two-factor-service";
import { getLocalServerSession } from "@/lib/local-auth";

export async function POST() {
  const session = await getLocalServerSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code, expiresAt } = await generateTwoFactorCode(session.user.id, "regenerate");
  return NextResponse.json({ message: "New local 2FA code generated", demoCode: code, expiresAt });
}
