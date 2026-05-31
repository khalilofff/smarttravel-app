import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getLocalServerSession } from "@/lib/local-auth";

export async function GET() {
  try {
    const session = await getLocalServerSession();
    if (!session?.user?.id) return NextResponse.json({ notifications: 0, messages: 0 });

    const [notifications, messages] = await Promise.all([
      prisma.notification.count({
        where: {
          userId: session.user.id,
          isRead: false,
          NOT: { type: "ADMIN_MESSAGE" },
        },
      }),
      prisma.notification.count({
        where: {
          userId: session.user.id,
          isRead: false,
          type: "ADMIN_MESSAGE",
        },
      }),
    ]);

    return NextResponse.json({ notifications, messages });
  } catch {
    return NextResponse.json({ notifications: 0, messages: 0 });
  }
}
