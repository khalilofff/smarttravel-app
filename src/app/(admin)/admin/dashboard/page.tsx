"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from "@/components/ui";
import {
  Shield, Users, Plane, ClipboardList, MapPinned,
  Activity, BarChart3, Bell, Loader2, RefreshCw, ArrowRight,
  Sparkles, Flag, Database, Crown, ShieldCheck, MessageSquare,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

const adminPanels = [
  { href: "/admin/users", title: "User Management", desc: "Review, activate and disable USER accounts only.", icon: Users },
  { href: "/admin/trips", title: "Trips", desc: "Monitor user trips, statuses, budgets and owners.", icon: Plane },
  { href: "/admin/bookings", title: "Bookings", desc: "Review booking status, providers and user reservations.", icon: ClipboardList },
  { href: "/admin/destinations", title: "Destinations", desc: "Review and maintain local destination catalog entries.", icon: MapPinned },
  { href: "/admin/moderation", title: "Moderation Queue", desc: "Review and resolve user-submitted reports.", icon: Flag },
  { href: "/admin/activity", title: "User & Booking Logs", desc: "View user activity logs and booking flow.", icon: Activity },
  { href: "/admin/styles", title: "Travel Styles", desc: "Compare travel style usage and related local stats.", icon: Sparkles },
  { href: "/admin/analytics", title: "Analytics", desc: "Manager analytics for trips, bookings, destinations and activity.", icon: BarChart3 },
];

const superAdminPanels = [
  { href: "/admin/users", title: "Users & Admins", desc: "Manage users, admins, roles and account status.", icon: Users },
  { href: "/admin/trips", title: "Trip Control", desc: "Monitor trips, owners, statuses and budgets.", icon: Plane },
  { href: "/admin/bookings", title: "Booking Management", desc: "Review pending, confirmed and cancelled bookings.", icon: ClipboardList },
  { href: "/admin/destinations", title: "Destination Catalog", desc: "Manage destination data, status and ratings.", icon: MapPinned },
  { href: "/admin/moderation", title: "Moderation", desc: "Review and resolve reported content from users.", icon: Flag },
  { href: "/admin/activity", title: "User & Admin Logs", desc: "View separated user and admin audit trails.", icon: Activity },
  { href: "/admin/notifications", title: "Send Notifications", desc: "Send in-app announcements to users.", icon: Bell },
  { href: "/admin/styles", title: "Travel Styles", desc: "Compare Budget, Family, Luxury and other style data.", icon: Sparkles },
  { href: "/admin/analytics", title: "Analytics", desc: "View platform statistics and visual breakdowns.", icon: BarChart3 },
  { href: "/admin/system", title: "System Tools", desc: "Local demo data tools, DB notes and backup guidance.", icon: Database },
];

export default function AdminDashboardPage() {
  const { data: session } = useSession();
  const role = session?.user?.role || "USER";
  const isSuperAdmin = role === "SUPER_ADMIN";

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin?type=stats");
    if (res.ok) setData(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const s = data?.stats || {};
  const panels = isSuperAdmin ? superAdminPanels : adminPanels;

  // Stats shown to both
  const sharedStats: [string, any, string, any][] = isSuperAdmin ? [
    ["Users", s.totalUsers, `${s.activeUsers || 0} active`, Users],
    ["Trips", s.totalTrips, `${s.activeTrips || 0} active`, Plane],
    ["Bookings", s.totalBookings, `${s.pendingBookings || 0} pending`, ClipboardList],
    ["Destinations", s.totalDestinations, `${s.activeDestinations || 0} active`, MapPinned],
    ["Notifications", s.unreadNotifications || 0, "unread", Bell],
  ] : [
    ["Users", s.totalUsers, `${s.activeUsers || 0} active`, Users],
    ["Trips", s.totalTrips, `${s.activeTrips || 0} active`, Plane],
    ["Bookings", s.totalBookings, `${s.pendingBookings || 0} pending`, ClipboardList],
        ["Moderation", s.pendingReports || 0, "pending reports", Flag],
    ["User Logs", s.userLogCount || 0, "user actions", Activity],
  ];

  // Extra stats only for super admin
  const superAdminStats: [string, any, string, any][] = [
    ["Total Planned Budgets", formatCurrency(s.totalBudget || 0), `${s.activeTrips || 0} active trips`, BarChart3],
    ["Admins", s.adminUsers || 0, `${s.superAdminUsers || 0} super admin`, Crown],
  ];

  const statsToShow = isSuperAdmin ? [...sharedStats, ...superAdminStats] : sharedStats;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-primary/10 p-3">
            {isSuperAdmin ? <Crown className="h-7 w-7 text-amber-500" /> : <ShieldCheck className="h-7 w-7 text-primary" />}
          </div>
          <div>
            <h1 className="text-3xl font-bold font-display">
              {isSuperAdmin ? "Super Manager Overview" : "Manager Overview"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isSuperAdmin
                ? "Full platform control — users, trips, system and logs."
                : "Manager panel — users, trips, bookings, destinations, moderation, analytics and activity."}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={load} className="gap-2"><RefreshCw className="h-4 w-4" /> Refresh</Button>
      </div>

      {/* Role info banner for Manager/Super Admin */}
      {!isSuperAdmin && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800 p-3 flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          You are logged in as <strong className="mx-1">Manager</strong>. You can review trips, bookings, destinations, analytics and booking logs. Manager can review users, trips, bookings, destinations, analytics and activity. System settings remain Super Admin only.
        </div>
      )}

      {/* Stats grid */}
      <div className={`grid gap-4 ${isSuperAdmin ? "grid-cols-2 xl:grid-cols-4" : "grid-cols-2 xl:grid-cols-5"}`}>
        {statsToShow.map(([label, value, sub, Icon]: any) => (
          <Card key={label}><CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-bold">{value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
              </div>
              <div className="rounded-xl bg-primary/10 p-2"><Icon className="h-5 w-5 text-primary" /></div>
            </div>
          </CardContent></Card>
        ))}
      </div>

      {/* Panel grid */}
      <div className="grid lg:grid-cols-4 gap-4">
        {panels.map((p) => (
          <Link key={p.href} href={p.href}>
            <Card className="h-full hover:border-primary/50 hover:bg-muted/20 transition-colors">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="rounded-xl bg-primary/10 p-2"><p.icon className="h-5 w-5 text-primary" /></div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div><h3 className="font-semibold">{p.title}</h3><p className="mt-1 text-xs text-muted-foreground leading-relaxed">{p.desc}</p></div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent activity tables */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Recent Users</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(data?.recentUsers || []).map((u: any) => (
              <div key={u.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{u.name || "Unnamed"}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <Badge variant={u.isActive ? "success" : "destructive"}>{u.isActive ? "Active" : "Disabled"}</Badge>
              </div>
            ))}
            {(!data?.recentUsers || data.recentUsers.length === 0) && <p className="text-sm text-muted-foreground text-center py-4">No users yet.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Plane className="h-4 w-4" /> Recent Trips</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(data?.recentTrips || []).map((t: any) => (
              <div key={t.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.user?.name || t.user?.email} · {formatCurrency(t.totalBudget)}</p>
                </div>
                <Badge variant="secondary">{t.status}</Badge>
              </div>
            ))}
            {(!data?.recentTrips || data.recentTrips.length === 0) && <p className="text-sm text-muted-foreground text-center py-4">No trips yet.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Recent Bookings</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(data?.recentBookings || []).map((b: any) => (
              <div key={b.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{b.provider}</p>
                  <p className="text-xs text-muted-foreground">{b.user?.name || b.user?.email} · {b.type}</p>
                </div>
                <Badge variant={b.status === "CONFIRMED" ? "success" : b.status === "CANCELLED" ? "destructive" : "secondary"}>{b.status}</Badge>
              </div>
            ))}
            {(!data?.recentBookings || data.recentBookings.length === 0) && <p className="text-sm text-muted-foreground text-center py-4">No bookings yet.</p>}
          </CardContent>
        </Card>

        {!isSuperAdmin && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Quick Links</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {[
                { href: "/admin/activity#messages", label: "Messages with Super Admin", icon: MessageSquare },
                { href: "/admin/notifications", label: "Send Notification to Users", icon: Bell },
                { href: "/admin/destinations", label: "Manage Destinations", icon: MapPinned },
              ].map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted text-sm transition-colors">
                  <Icon className="h-4 w-4 text-primary" /> {label}
                  <ArrowRight className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
                </Link>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
