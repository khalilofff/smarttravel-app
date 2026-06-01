"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from "@/components/ui";
import {
  Activity,
  Database,
  ShieldCheck,
  Server,
  Clock,
  RefreshCw,
  Plane,
  Hotel,
  MapPin,
  Bell,
  CheckCircle2,
  Mail,
  HardDrive,
  Bot,
  ExternalLink,
} from "lucide-react";

type HealthData = {
  status: "ok" | "degraded" | "error";
  uptimeSeconds: number;
  processUptimeSeconds?: number;
  responseTimeMs: number;
  databaseLatencyMs?: number | null;
  serverStartedAt?: string;
  appStartedAt?: string;
  nodeVersion?: string;
  mode?: string;
  services: Record<string, string>;
  counts?: { users: number; trips: number; bookings: number; notifications: number };
  timestamp?: string;
};

function formatUptime(seconds = 0) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (days) return `${days}d ${hours}h ${minutes}m`;
  if (hours) return `${hours}h ${minutes}m ${secs}s`;
  if (minutes) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

function formatDate(value?: string) {
  if (!value) return "Checking...";
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function statusBadge(status?: string) {
  const normalized = (status || "checking").toLowerCase();
  if (["ok", "running", "connected", "external-provider-redirects", "local-filesystem"].includes(normalized)) {
    return <Badge variant="success">Running</Badge>;
  }
  if (["degraded", "not-configured", "local-ollama-or-fallback"].includes(normalized)) {
    return <Badge variant="warning">Limited</Badge>;
  }
  if (normalized === "error") return <Badge variant="destructive">Error</Badge>;
  return <Badge variant="outline">Checking</Badge>;
}

function StatusTile({
  icon: Icon,
  label,
  value,
  sub,
  tone = "primary",
}: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
  tone?: "primary" | "green" | "yellow" | "red";
}) {
  const toneClass = {
    primary: "bg-primary/10 text-primary border-primary/20",
    green: "bg-green-500/10 text-green-400 border-green-500/20",
    yellow: "bg-yellow-500/10 text-yellow-300 border-yellow-500/20",
    red: "bg-red-500/10 text-red-300 border-red-500/20",
  }[tone];

  return (
    <div className="rounded-2xl border border-border bg-card/80 p-4 overflow-hidden">
      <div className="flex min-h-[4.25rem] items-center gap-3">
        <div className={`admin-icon-box h-11 w-11 rounded-xl border ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-lg font-semibold">{value}</p>
          {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
        </div>
      </div>
    </div>
  );
}

export default function AdminSystemPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [healthError, setHealthError] = useState("");
  const [loading, setLoading] = useState(false);
  const [flightProvider, setFlightProvider] = useState("AUTO");
  const [savingProvider, setSavingProvider] = useState(false);

  const loadHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/health?t=${Date.now()}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Health check failed");
      setHealth(json);
      setHealthError("");
    } catch (err: any) {
      setHealth(null);
      setHealthError(err?.message || "Health check failed");
    } finally {
      setLoading(false);
    }
  };

  const hardRefresh = () => {
    window.location.reload();
  };

  const flightProviders = [
    { value: "AUTO", title: "Auto", desc: "SerpApi #3 → #2 → #1 → SearchApi → Duffel" },
    { value: "SERPAPI_3", title: "SerpApi #3", desc: "Newest SerpApi Google Flights key" },
    { value: "SERPAPI_2", title: "SerpApi #2", desc: "Backup SerpApi key" },
    { value: "SERPAPI_1", title: "SerpApi #1", desc: "Original SerpApi key" },
    { value: "SEARCHAPI", title: "SearchApi", desc: "Google Flights through SearchAPI" },
    { value: "DUFFEL", title: "Duffel Sandbox", desc: "Sandbox offers only; no real booking" },
  ];

  const loadFlightProvider = async () => {
    const res = await fetch("/api/admin/flight-provider", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (data?.provider) setFlightProvider(data.provider);
  };

  const saveFlightProvider = async (provider: string) => {
    setSavingProvider(true);
    try {
      const res = await fetch("/api/admin/flight-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save provider");
      setFlightProvider(data.provider);
    } finally {
      setSavingProvider(false);
    }
  };

  useEffect(() => {
    loadHealth();
    loadFlightProvider();
    const timer = window.setInterval(loadHealth, 15000);
    return () => window.clearInterval(timer);
  }, []);

  const statusTone = health?.status === "ok" ? "green" : health?.status === "degraded" ? "yellow" : "red";

  const serviceRows = useMemo(
    () => [
      ["Flight search", "Provider fallback flow is enabled.", Plane, health?.services?.bookingMode || "checking"],
      ["Hotels", "Live hotel provider results when configured.", Hotel, "running"],
      ["Places & restaurants", "External map redirects and city data.", MapPin, "running"],
      ["Notifications", "In-app notification system.", Bell, "running"],
      ["Email", "SMTP status for reset and verification.", Mail, health?.services?.email || "checking"],
      ["AI planner", "Local Ollama or fallback planning flow.", Bot, health?.services?.aiPlanner || "checking"],
      ["Uploads", "Profile images and local files.", HardDrive, health?.services?.uploads || "checking"],
      ["External links", "Bookings redirect to providers.", ExternalLink, "running"],
    ] as const,
    [health]
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="admin-icon-box rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            <Database className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold font-display">System Status</h1>
            <p className="text-sm text-muted-foreground">Real server, database and provider status for SmartTravel.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={loadHealth} disabled={loading} className="gap-2">
            <Activity className={`h-4 w-4 ${loading ? "animate-pulse" : ""}`} />
            Check status
          </Button>
          <Button onClick={hardRefresh} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            F5 Refresh
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <span className="admin-icon-box h-10 w-10 rounded-xl bg-green-500/10 text-green-500"><ShieldCheck className="h-5 w-5" /></span>
              <div>
                <h3 className="font-semibold">Presentation Safe</h3>
                <p className="mt-1 text-sm text-muted-foreground">The admin UI shows safe live status information for the presentation build.</p>
                <Badge variant="success" className="mt-3">Locked</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <span className="admin-icon-box h-10 w-10 rounded-xl bg-primary/10 text-primary"><Database className="h-5 w-5" /></span>
              <div>
                <h3 className="font-semibold">Database</h3>
                <p className="mt-1 text-sm text-muted-foreground">Prisma is checked through a real server route, not static text.</p>
                <div className="mt-3">{statusBadge(health?.services?.database)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <span className="admin-icon-box h-10 w-10 rounded-xl bg-primary/10 text-primary"><Server className="h-5 w-5" /></span>
              <div>
                <h3 className="font-semibold">Runtime</h3>
                <p className="mt-1 text-sm text-muted-foreground">Current Node runtime and deployed server process information.</p>
                <Badge className="mt-3">{health?.mode || "Checking"}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Plane className="h-4 w-4 text-primary" /> Flight API Provider</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Choose the default flight provider used by regular users in the planner. Managers and super admins can still see the provider setting here.</p>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {flightProviders.map((provider) => {
              const active = flightProvider === provider.value;
              return (
                <button
                  key={provider.value}
                  type="button"
                  disabled={savingProvider}
                  onClick={() => saveFlightProvider(provider.value)}
                  className={`rounded-2xl border p-4 text-left transition-colors ${active ? "border-primary bg-primary/10" : "bg-card hover:bg-muted/40"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{provider.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{provider.desc}</p>
                    </div>
                    {active ? <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" /> : null}
                  </div>
                </button>
              );
            })}
          </div>
          <Badge variant="outline">Current provider: {flightProvider}</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Live Status</CardTitle>
        </CardHeader>
        <CardContent>
          {healthError ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{healthError}</div>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatusTile icon={Server} label="Server" value={health?.status === "ok" ? "Running" : health?.status === "degraded" ? "Limited" : "Checking..."} sub={health?.nodeVersion || "Node runtime"} tone={statusTone} />
              <StatusTile icon={Database} label="Database" value={health?.services?.database || "Checking..."} sub={health?.databaseLatencyMs != null ? `${health.databaseLatencyMs} ms database ping` : "Prisma route check"} />
              <StatusTile icon={Clock} label="Server uptime" value={health ? formatUptime(health.uptimeSeconds) : "Checking..."} sub={`Booted ${formatDate(health?.serverStartedAt)}`} tone="yellow" />
              <StatusTile icon={Activity} label="Response" value={health ? `${health.responseTimeMs} ms` : "Checking..."} sub={health?.timestamp ? `Updated ${formatDate(health.timestamp)}` : "Live API response"} />
            </div>
          )}
        </CardContent>
      </Card>

      {health?.counts ? (
        <div className="grid md:grid-cols-4 gap-4">
          <StatusTile icon={Database} label="Users" value={String(health.counts.users)} sub="Total accounts" />
          <StatusTile icon={Plane} label="Trips" value={String(health.counts.trips)} sub="Saved trips" />
          <StatusTile icon={ExternalLink} label="Bookings" value={String(health.counts.bookings)} sub="Saved booking records" />
          <StatusTile icon={Bell} label="Notifications" value={String(health.counts.notifications)} sub="In-app records" />
        </div>
      ) : null}

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {serviceRows.map(([name, desc, Icon, state]) => (
          <Card key={name}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="admin-icon-box h-10 w-10 rounded-xl border border-primary/20 bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">{name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
                  <div className="mt-3">{statusBadge(state)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
