"use client";
import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Input, Textarea, Select, Label } from "@/components/ui";
import { Activity, Loader2, Bell, Crown, Users, MessageSquare, Send, RefreshCw, ShieldCheck } from "lucide-react";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

type Tab = "user-logs" | "super-admin-logs" | "manager-logs" | "my-actions" | "notifications" | "messages";

function EmptyState({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground text-center py-8">{text}</p>;
}

function LogRow({ action, by, target, date, badge }: { action: string; by?: string; target?: string; date: string; badge?: string }) {
  return (
    <div className="border-b last:border-0 pb-3 last:pb-0">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">{action}</p>
        {badge && <Badge variant="secondary" className="shrink-0 text-[10px]">{badge}</Badge>}
      </div>
      {by && <p className="text-xs text-muted-foreground mt-0.5">{by}{target ? ` · ${target}` : ""}</p>}
      <p className="text-xs text-muted-foreground">{date}</p>
    </div>
  );
}

export default function AdminActivityPage() {
  const { data: session } = useSession();
  const role = session?.user?.role || "USER";
  const isSuperAdmin = role === "SUPER_ADMIN";

  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("user-logs");

  // Message state
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [msgTo, setMsgTo] = useState("");
  const [msgTitle, setMsgTitle] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [sending, setSending] = useState(false);
  const [myMessages, setMyMessages] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin?type=activity");
      if (res.ok) setData(await res.json());
    } catch { toast.error("Failed to load activity"); }
    finally { setLoading(false); }
  };

  const loadMessages = async () => {
    try {
      const [msgRes, usersRes] = await Promise.all([
        fetch("/api/admin?type=messages"),
        fetch("/api/admin?type=admins"),
      ]);
      if (msgRes.ok) setMyMessages(await msgRes.json());
      if (usersRes.ok) {
        const all = await usersRes.json();
        setAdminUsers(Array.isArray(all) ? all : []);
      }
    } catch { }
  };

  useEffect(() => {
    load();
    loadMessages();
  }, []);

  const sendMessage = async () => {
    if (!msgTo || !msgTitle.trim() || !msgBody.trim()) {
      toast.error("Please fill all message fields");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "message", toUserId: msgTo, title: msgTitle.trim(), message: msgBody.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Failed to send");
      toast.success("Message sent");
      setMsgTitle(""); setMsgBody(""); setMsgTo("");
      loadMessages();
    } catch (e: any) { toast.error(e.message || "Send failed"); }
    finally { setSending(false); }
  };

  // Tab config per role
  const tabs: { key: Tab; label: string; icon: any; superAdminOnly?: boolean }[] = [
    { key: "user-logs", label: "User Logs", icon: Users },
    ...(isSuperAdmin
      ? [
          { key: "super-admin-logs" as Tab, label: "Super Admin Logs", icon: Crown },
          { key: "manager-logs" as Tab, label: "Manager Logs", icon: ShieldCheck },
        ]
      : [
          { key: "my-actions" as Tab, label: "My Actions", icon: ShieldCheck },
        ]),
    { key: "notifications", label: "Notifications", icon: Bell },
    { key: "messages", label: "Messages", icon: MessageSquare },
  ];

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold font-display">Activity Logs</h1>
            <p className="text-sm text-muted-foreground">
              {isSuperAdmin
                ? "Full platform audit — user logs, admin logs, manager logs and messages."
                : "User activity, your admin actions and admin messaging."}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={load} className="gap-2"><RefreshCw className="h-4 w-4" /> Refresh</Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            {t.key === "user-logs" && data.activity?.length > 0 && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1">{data.activity.length}</Badge>
            )}

            {t.key === "super-admin-logs" && data.adminLogs?.length > 0 && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1">{data.adminLogs.length}</Badge>
            )}
            {t.key === "manager-logs" && data.managerLogs?.length > 0 && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1">{data.managerLogs.length}</Badge>
            )}
            {t.key === "my-actions" && data.myActions?.length > 0 && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1">{data.myActions.length}</Badge>
            )}
            {t.key === "messages" && myMessages.filter((m: any) => !m.isRead).length > 0 && (
              <Badge className="text-[10px] h-4 px-1">{myMessages.filter((m: any) => !m.isRead).length}</Badge>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "user-logs" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> User Activity
              <Badge variant="secondary">{data.activity?.length || 0} entries</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
            {(data.activity || []).map((a: any) => (
              <div key={a.id}>
                <LogRow action={a.action}
                by={a.user?.name || a.user?.email || "System"}
                target={a.trip?.title}
                date={formatDate(a.createdAt)} />
              </div>
            ))}
            {(!data.activity || data.activity.length === 0) && <EmptyState text="No user activity yet." />}
          </CardContent>
        </Card>
      )}

      {activeTab === "super-admin-logs" && isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-500" /> Super Admin Actions
              <Badge variant="secondary">{data.adminLogs?.length || 0} entries</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
            {(data.adminLogs || []).map((a: any) => (
              <div key={a.id}>
                <LogRow action={a.action}
                by={a.admin?.name || a.admin?.email}
                target={a.targetType ? `${a.targetType}${a.details ? ` · ${a.details}` : ""}` : a.details}
                date={formatDate(a.createdAt)}
                badge="SUPER_ADMIN" />
              </div>
            ))}
            {(!data.adminLogs || data.adminLogs.length === 0) && <EmptyState text="No super admin actions yet." />}
          </CardContent>
        </Card>
      )}

      {activeTab === "manager-logs" && isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-500" /> Manager (Admin) Actions
              <Badge variant="secondary">{data.managerLogs?.length || 0} entries</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
            {(data.managerLogs || []).map((a: any) => (
              <div key={a.id}>
                <LogRow action={a.action}
                by={a.manager?.name || a.manager?.email}
                target={a.targetType ? `${a.targetType}${a.details ? ` · ${a.details}` : ""}` : a.details}
                date={formatDate(a.createdAt)}
                badge="MANAGER" />
              </div>
            ))}
            {(!data.managerLogs || data.managerLogs.length === 0) && <EmptyState text="No manager actions yet." />}
          </CardContent>
        </Card>
      )}

      {activeTab === "my-actions" && !isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-500" /> My Admin Actions
              <Badge variant="secondary">{data.myActions?.length || 0} entries</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
            {(data.myActions || []).map((a: any) => (
              <div key={a.id}>
                <LogRow action={a.action}
                target={a.targetType ? `${a.targetType}${a.details ? ` · ${a.details}` : ""}` : a.details}
                date={formatDate(a.createdAt)} />
              </div>
            ))}
            {(!data.myActions || data.myActions.length === 0) && <EmptyState text="No actions recorded yet." />}
          </CardContent>
        </Card>
      )}

      {activeTab === "notifications" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4" /> Notification Log
              <Badge variant="secondary">{data.notifications?.length || 0} entries</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
            {(data.notifications || []).map((n: any) => (
              <div key={n.id} className="border-b last:border-0 pb-3 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{n.title}</p>
                  <Badge variant={n.isRead ? "secondary" : "default"}>{n.isRead ? "Read" : "Unread"}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{n.user?.name || n.user?.email} · {n.type}</p>
                <p className="text-xs text-muted-foreground">{formatDate(n.createdAt)}</p>
              </div>
            ))}
            {(!data.notifications || data.notifications.length === 0) && <EmptyState text="No notifications yet." />}
          </CardContent>
        </Card>
      )}

      {activeTab === "messages" && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Compose */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Send className="h-4 w-4" /> Send Message
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                {isSuperAdmin
                  ? "Send a direct message to any Manager."
                  : "Send a direct message to the Super Admin."}
              </p>
              <div>
                <Label>To</Label>
                <Select value={msgTo} onChange={(e) => setMsgTo(e.target.value)}>
                  <option value="">Select recipient...</option>
                  {adminUsers
                    .filter((u: any) => {
                      if (isSuperAdmin) return u.role === "MANAGER";
                      return u.role === "SUPER_ADMIN";
                    })
                    .map((u: any) => (
                      <option key={u.id} value={u.id}>{u.name || u.email} ({u.role})</option>
                    ))}
                </Select>
              </div>
              <div>
                <Label>Subject</Label>
                <Input value={msgTitle} onChange={(e) => setMsgTitle(e.target.value)} placeholder="Message subject..." />
              </div>
              <div>
                <Label>Message</Label>
                <Textarea value={msgBody} onChange={(e) => setMsgBody(e.target.value)} rows={4} placeholder="Write your message here..." />
              </div>
              <Button onClick={sendMessage} loading={sending} disabled={!msgTo || !msgTitle.trim() || !msgBody.trim()} className="gap-2 w-full">
                <Send className="h-4 w-4" /> Send Message
              </Button>
            </CardContent>
          </Card>

          {/* Inbox */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Inbox
                {myMessages.filter((m: any) => !m.isRead).length > 0 && (
                  <Badge>{myMessages.filter((m: any) => !m.isRead).length} new</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
              {myMessages.map((m: any) => {
                let fromInfo = "";
                try {
                  const meta = JSON.parse(m.metadata || "{}");
                  fromInfo = meta.fromRole ? `From: ${meta.fromRole}` : "";
                } catch {}
                return (
                  <div key={m.id} className={`border-b last:border-0 pb-3 last:pb-0 rounded-lg p-2 ${!m.isRead ? "bg-primary/5" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{m.title}</p>
                      <Badge variant={m.isRead ? "secondary" : "default"} className="shrink-0 text-[10px]">
                        {m.isRead ? "Read" : "New"}
                      </Badge>
                    </div>
                    {fromInfo && <p className="text-xs text-muted-foreground mt-0.5">{fromInfo}</p>}
                    <p className="text-sm mt-1 text-muted-foreground">{m.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(m.createdAt)}</p>
                  </div>
                );
              })}
              {myMessages.length === 0 && <EmptyState text="No messages yet." />}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
