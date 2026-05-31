import { requireAuth } from "@/lib/session";
import prisma from "@/lib/db";
import { Card, CardContent, EmptyState } from "@/components/ui";
import { Activity, Plane, PiggyBank, Users, MessageSquare, BookOpen, Sparkles, Bell } from "lucide-react";
import { formatDate } from "@/lib/utils";

const actionIcons: Record<string, any> = {
  TRIP_CREATE: Plane, TRIP_UPDATE: Plane, TRIP_DELETE: Plane,
  EXPENSE_ADD: PiggyBank, BOOKING_ADD: BookOpen, COLLAB_INVITE: Users,
  COMMENT_ADD: MessageSquare, ITINERARY_GEN: Sparkles, VOTE: Users,
};

export default async function ActivityPage() {
  const user = await requireAuth();

  // Get recent notifications as activity proxy
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Get recent audit logs for this user
  const auditLogs = await prisma.auditLog.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Merge and sort by date
  const activities = [
    ...notifications.map((n: any) => ({ id: n.id, type: "notification", title: n.title, message: n.message, date: n.createdAt, link: n.link })),
    ...auditLogs.map((a: any) => ({ id: a.id, type: "audit", title: a.action, message: typeof a.details === "string" ? a.details : "", date: a.createdAt, link: null })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold font-display flex items-center gap-2"><Activity className="h-6 w-6 text-primary" /> Activity Log</h1>
        <p className="text-muted-foreground text-sm mt-1">Your recent actions and notifications.</p>
      </div>

      {activities.length === 0 ? (
        <EmptyState icon={Activity} title="No activity yet" description="Your actions will appear here as you use the platform." />
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-4">
            {activities.map((act, i) => (
              <div key={act.id} className="flex gap-4 relative">
                <div className="w-10 h-10 rounded-full bg-card border-2 border-primary/20 flex items-center justify-center shrink-0 z-10">
                  {act.type === "notification" ? (
                    <Bell className="h-4 w-4 text-primary" />
                  ) : (
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <Card className="flex-1">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium">{act.title}</p>
                        {act.message && <p className="text-xs text-muted-foreground mt-0.5">{act.message}</p>}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">{formatDate(act.date)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
