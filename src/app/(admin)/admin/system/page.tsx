"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from "@/components/ui";
import { Activity, Database, ShieldCheck, Server, Clock, RefreshCw, Plane, Hotel, MapPin, Bell } from "lucide-react";

type HealthData = {
  status: "ok" | "error";
  uptimeSeconds: number;
  responseTimeMs: number;
  services: Record<string, string>;
  counts?: { users: number; trips: number; bookings: number; notifications: number };
};

function formatUptime(seconds = 0) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days) return `${days}d ${hours}h ${minutes}m`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds % 60}s`;
}

export default function AdminSystemPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [healthError, setHealthError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
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

  useEffect(() => {
    loadHealth();
    const timer = window.setInterval(loadHealth, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const serviceRows = [
    ["Flight search", "SerpApi / SearchApi / Duffel provider flow", Plane],
    ["Hotels", "Live provider results when configured", Hotel],
    ["Places & restaurants", "Live place data and external map redirects", MapPin],
    ["Notifications", "In-app notifications only", Bell],
  ] as const;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Database className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-3xl font-bold font-display">System Status</h1>
            <p className="text-sm text-muted-foreground">Read-only platform status for the presentation build.</p>
          </div>
        </div>
        <Button variant="outline" onClick={loadHealth} disabled={loading} className="gap-2"><RefreshCw className="h-4 w-4" /> Refresh</Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card><CardContent className="p-5"><ShieldCheck className="h-6 w-6 text-green-500 mb-3" /><h3 className="font-semibold">Presentation Safe</h3><p className="text-sm text-muted-foreground mt-1">The admin UI shows only safe live status information for the presentation build.</p><Badge variant="success" className="mt-3">Locked</Badge></CardContent></Card>
        <Card><CardContent className="p-5"><Database className="h-6 w-6 text-primary mb-3" /><h3 className="font-semibold">Database</h3><p className="text-sm text-muted-foreground mt-1">Local Prisma database is used for demo users, trips, bookings and activity.</p><Badge className="mt-3">Prisma</Badge></CardContent></Card>
        <Card><CardContent className="p-5"><Server className="h-6 w-6 text-primary mb-3" /><h3 className="font-semibold">Runtime</h3><p className="text-sm text-muted-foreground mt-1">AI stays local. SmartTravel redirects users to real provider pages instead of selling tickets.</p><Badge className="mt-3">Local AI</Badge></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Live Status</CardTitle>
        </CardHeader>
        <CardContent>
          {healthError ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{healthError}</div>
          ) : (
            <div className="grid md:grid-cols-4 gap-4">
              <div className="rounded-xl border border-border bg-muted/30 p-4"><Server className="h-5 w-5 text-green-500 mb-2" /><p className="text-xs text-muted-foreground">Server</p><p className="font-semibold">{health?.status === "ok" ? "Running" : "Checking..."}</p></div>
              <div className="rounded-xl border border-border bg-muted/30 p-4"><Database className="h-5 w-5 text-primary mb-2" /><p className="text-xs text-muted-foreground">Database</p><p className="font-semibold">{health?.services?.database || "Checking..."}</p></div>
              <div className="rounded-xl border border-border bg-muted/30 p-4"><Clock className="h-5 w-5 text-yellow-500 mb-2" /><p className="text-xs text-muted-foreground">Uptime</p><p className="font-semibold">{health ? formatUptime(health.uptimeSeconds) : "Checking..."}</p></div>
              <div className="rounded-xl border border-border bg-muted/30 p-4"><Activity className="h-5 w-5 text-primary mb-2" /><p className="text-xs text-muted-foreground">Response</p><p className="font-semibold">{health ? `${health.responseTimeMs} ms` : "Checking..."}</p></div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {serviceRows.map(([name, desc, Icon]) => (
          <Card key={name}><CardContent className="p-5"><Icon className="h-5 w-5 text-primary mb-3" /><h3 className="font-semibold">{name}</h3><p className="text-sm text-muted-foreground mt-1">{desc}</p></CardContent></Card>
        ))}
      </div>
    </div>
  );
}
