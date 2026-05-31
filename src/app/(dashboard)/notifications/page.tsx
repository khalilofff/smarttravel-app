"use client";

import { useState, useEffect } from "react";
import { Button, Card, CardContent, Badge, EmptyState } from "@/components/ui";
import { Bell, Check, CheckCheck, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import toast from "react-hot-toast";

const typeIcons: Record<string, string> = {
  TRIP_INVITE: "🎒", COLLABORATOR_ACTIVITY: "👥", ITINERARY_GENERATED: "🗺️",
  BUDGET_WARNING: "⚠️", BOOKING_UPDATE: "📋", TRIP_REMINDER: "⏰",
  VOTE_RECEIVED: "👍", COMMENT_RECEIVED: "💬", ADMIN_ANNOUNCEMENT: "📢", SYSTEM: "🔔",
};

export default function NotificationsPage() {
  const [data, setData] = useState<{ notifications: any[]; unreadCount: number }>({ notifications: [], unreadCount: 0 });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const res = await fetch("/api/notifications");
    if (res.ok) setData(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const markRead = async (id: string) => {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notificationId: id }) });
    fetchData();
  };

  const markAllRead = async () => {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ markAll: true }) });
    toast.success("All marked as read");
    fetchData();
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Notifications</h1>
          <p className="text-sm text-muted-foreground">{data.unreadCount} unread</p>
        </div>
        {data.unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead} className="gap-1"><CheckCheck className="h-4 w-4" /> Mark all read</Button>
        )}
      </div>

      {data.notifications.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" description="You're all caught up! Notifications will appear here." />
      ) : (
        <div className="space-y-2">
          {data.notifications.map(n => (
            <Card key={n.id} className={n.isRead ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl">{typeIcons[n.type] || "🔔"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{n.title}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{formatDate(n.createdAt)}</p>
                      </div>
                      {!n.isRead && (
                        <button onClick={() => markRead(n.id)} className="p-1.5 rounded-md hover:bg-muted shrink-0" title="Mark read">
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    {n.link && <Link href={n.link} className="text-xs text-primary hover:underline mt-1 block">View details →</Link>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
