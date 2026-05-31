import { NextRequest, NextResponse } from "next/server";
import { getUserNotifications, getUnreadCount, markAsRead, markAllAsRead } from "@/lib/services/notification-service";
import { getLocalServerSession } from "@/lib/local-auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getLocalServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;
    const notifications = await getUserNotifications(userId);
    const unreadCount = await getUnreadCount(userId);
    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getLocalServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;
    const { notificationId, markAll } = await req.json();
    if (markAll) {
      await markAllAsRead(userId);
    } else if (notificationId) {
      await markAsRead(notificationId, userId);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
