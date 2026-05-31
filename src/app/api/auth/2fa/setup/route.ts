import { NextResponse } from "next/server";
import { generateTwoFactorCode } from "@/lib/services/two-factor-service";
import prisma from "@/lib/db";
import { getLocalServerSession } from "@/lib/local-auth";

export async function POST() {
  const session = await getLocalServerSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { twoFactorEnabled: true } });
  if (user?.twoFactorEnabled) return NextResponse.json({ error: "2FA is already enabled" }, { status: 400 });

  const { code, expiresAt } = await generateTwoFactorCode(session.user.id, "setup");
  await prisma.notification.create({
    data: {
      userId: session.user.id,
      type: "SECURITY",
      title: "Local 2FA setup code generated",
      message: `Demo 2FA code: ${code}`,
      link: "/settings",
    },
  });

  return NextResponse.json({ message: "Local 2FA setup code generated", demoCode: code, expiresAt });
}
