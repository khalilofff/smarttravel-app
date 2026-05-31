import { NextRequest, NextResponse } from "next/server";
import { enableTwoFactor } from "@/lib/services/two-factor-service";
import prisma from "@/lib/db";
import { getLocalServerSession } from "@/lib/local-auth";

export async function POST(req: NextRequest) {
  const session = await getLocalServerSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { code } = await req.json();
  if (!code) return NextResponse.json({ error: "Code is required" }, { status: 400 });

  try {
    await enableTwoFactor(session.user.id, code);
    await prisma.notification.create({
      data: { userId: session.user.id, type: "SECURITY", title: "2FA enabled", message: "Local demo 2FA is now enabled.", link: "/settings" },
    });
    return NextResponse.json({ success: true, message: "2FA enabled" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid code" }, { status: 400 });
  }
}
