import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getLocalServerSession } from "@/lib/local-auth";

export async function GET() {
  try {
    const session = await getLocalServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;
    const [notifications, auditLogs] = await Promise.all([
      prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 6 }),
      prisma.auditLog.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 6 }),
    ]);
    const activities = [
      ...notifications.map((n: any) => ({ id: n.id, type: "notification", title: n.title, message: n.message, createdAt: n.createdAt, link: n.link })),
      ...auditLogs.map((a: any) => ({ id: a.id, type: "audit", title: a.action, message: a.details || "", createdAt: a.createdAt, link: null })),
    ].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8);
    return NextResponse.json({ activities });
  } catch (error) {
    console.error("Recent activity error:", error);
    return NextResponse.json({ error: "Could not load recent activity" }, { status: 500 });
  }
}
