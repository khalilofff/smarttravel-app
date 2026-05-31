import { NextResponse } from "next/server";
import { disableTwoFactor } from "@/lib/services/two-factor-service";
import prisma from "@/lib/db";
import { getLocalServerSession } from "@/lib/local-auth";

export async function POST() {
  const session = await getLocalServerSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await disableTwoFactor(session.user.id);
  await prisma.notification.create({
    data: { userId: session.user.id, type: "SECURITY", title: "2FA disabled", message: "Local demo 2FA has been disabled.", link: "/settings" },
  });
  return NextResponse.json({ success: true, message: "2FA disabled" });
}
