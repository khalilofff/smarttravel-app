"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, Badge, Avatar, Button } from "@/components/ui";
import { ArrowLeft, Loader2, User, Plane, Receipt, Bell, ShieldCheck, ShieldOff, Activity, BookOpen } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

export default function AdminUserDetailPage() {
  const params = useParams();
  const id = String(params.id || "");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const loadUser = () => {
    setLoading(true);
    fetch("/api/admin?type=user-detail&id=" + encodeURIComponent(id))
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "User could not be loaded"); setUser(d); })
      .catch(e => toast.error(e.message || "User could not be loaded"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadUser(); }, [id]);

  const toggleActive = async () => {
    setToggling(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, action: "TOGGLE_ACTIVE" }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`User ${data.isActive ? "activated" : "suspended"}`);
        loadUser();
      } else {
        toast.error(data.error || "Could not update user");
      }
    } catch { toast.error("Failed to update user"); }
    finally { setToggling(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) return <Card><CardContent className="py-10 text-center">User not found.</CardContent></Card>;

  const statusColor = user.isActive
    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
    : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Avatar with image support */}
          <div className="relative">
            {user.image ? (
              <img src={user.image} alt={user.name || "User"} className="w-16 h-16 rounded-2xl object-cover ring-2 ring-border" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center ring-2 ring-border">
                <span className="text-2xl font-bold text-primary">{(user.name || user.email || "?")[0].toUpperCase()}</span>
              </div>
            )}
            <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background ${user.isActive ? "bg-green-500" : "bg-red-500"}`} />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display">{user.name || "Unnamed User"}</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>{user.isActive ? "Active" : "Suspended"}</span>
              <Badge variant={user.false ? "default" : "secondary"} className="text-xs">{user.role}</Badge>
              {user.twoFactorEnabled && <Badge variant="outline" className="text-xs gap-1"><ShieldCheck className="h-3 w-3" />2FA</Badge>}
              {user.emailVerified && <Badge variant="outline" className="text-xs text-green-600">Verified</Badge>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleActive}
            loading={toggling}
            className={`gap-2 ${user.isActive ? "text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950" : "text-green-600 border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-950"}`}
          >
            {user.isActive ? <><ShieldOff className="h-4 w-4" /> Suspend</> : <><ShieldCheck className="h-4 w-4" /> Activate</>}
          </Button>
          <Link href="/admin/users">
            <Button variant="outline" size="sm" className="gap-2"><ArrowLeft className="h-4 w-4" /> Back</Button>
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <User className="h-5 w-5 text-primary mb-2" />
          <p className="text-xs text-muted-foreground">Member since</p>
          <p className="font-semibold text-sm">{formatDate(user.createdAt)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <BookOpen className="h-5 w-5 text-primary mb-2" />
          <p className="text-xs text-muted-foreground">Bookings</p>
          <p className="font-bold text-lg">{user._count?.bookings || 0}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <Plane className="h-5 w-5 text-primary mb-2" />
          <p className="text-xs text-muted-foreground">Total Trips</p>
          <p className="font-bold text-lg">{user._count?.trips || 0}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <Receipt className="h-5 w-5 text-primary mb-2" />
          <p className="text-xs text-muted-foreground">Expenses</p>
          <p className="font-bold text-lg">{user._count?.expenses || 0}</p>
        </CardContent></Card>
      </div>

      {/* Trips & Bookings */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Plane className="h-4 w-4" /> Recent Trips ({user._count?.trips || 0})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(user.trips || []).length === 0
              ? <p className="text-sm text-muted-foreground text-center py-4">No trips yet.</p>
              : (user.trips || []).map((t: any) => (
                <div key={t.id} className="flex justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <p className="font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{t.travelStyle} · {formatDate(t.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(t.totalBudget || 0)}</p>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-muted">{t.status}</span>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BookOpen className="h-4 w-4" /> Recent Bookings</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {!(user.bookings?.length)
              ? <p className="text-sm text-muted-foreground text-center py-4">No bookings yet.</p>
              : (user.bookings || []).map((b: any) => (
                <div key={b.id} className="flex justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <p className="font-medium">{b.provider}</p>
                    <p className="text-xs text-muted-foreground">{b.type} · {b.status}</p>
                  </div>
                  <p className="font-semibold">{formatCurrency(b.amount || 0)}</p>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>

      {/* Notifications & Audit */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Bell className="h-4 w-4" /> Notifications ({user._count?.notifications || 0})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {!(user.notifications?.length)
              ? <p className="text-sm text-muted-foreground text-center py-4">No notifications.</p>
              : (user.notifications || []).map((n: any) => (
                <div key={n.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex justify-between items-start">
                    <p className="font-medium">{n.title}</p>
                    <Badge variant={n.isRead ? "secondary" : "default"} className="text-xs shrink-0 ml-2">{n.isRead ? "Read" : "Unread"}</Badge>
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatDate(n.createdAt)}</p>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4" /> Audit Log</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {!(user.auditLogs?.length)
              ? <p className="text-sm text-muted-foreground text-center py-4">No audit logs.</p>
              : (user.auditLogs || []).map((a: any) => (
                <div key={a.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{a.action.replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(a.createdAt)}</p>
                  </div>
                  {a.details && <p className="text-xs text-muted-foreground mt-0.5 truncate">{a.details}</p>}
                </div>
              ))}
          </CardContent>
        </Card>
      </div>

      {/* Preferences */}
      {user.preference && (
        <Card>
          <CardHeader><CardTitle className="text-base">Travel Preferences</CardTitle></CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <div><p className="text-muted-foreground text-xs">Travel Style</p><p className="font-medium mt-0.5">{user.preference.travelStyle}</p></div>
              <div><p className="text-muted-foreground text-xs">Budget Style</p><p className="font-medium mt-0.5">{user.preference.budgetStyle}</p></div>
              <div><p className="text-muted-foreground text-xs">Travel Pace</p><p className="font-medium mt-0.5">{user.preference.travelPace}</p></div>
              <div><p className="text-muted-foreground text-xs">Accommodation</p><p className="font-medium mt-0.5">{user.preference.accommodationType}</p></div>
              <div><p className="text-muted-foreground text-xs">Notifications</p><p className="font-medium mt-0.5">{user.preference.notificationsEnabled ? "Enabled" : "Disabled"}</p></div>
              <div><p className="text-muted-foreground text-xs">2FA</p><p className="font-medium mt-0.5">{user.twoFactorEnabled ? "Enabled" : "Disabled"}</p></div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
