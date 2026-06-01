import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import os from "os";

export const runtime = "nodejs";

type ServiceState = "running" | "connected" | "degraded" | "error" | "not-configured";

function formatServiceState(value: ServiceState) {
  return value;
}

export async function GET() {
  const startedAt = Date.now();
  const processUptimeSeconds = Math.max(0, Math.floor(process.uptime()));
  const osUptimeSeconds = Math.max(0, Math.floor(os.uptime()));
  const serverStartedAt = new Date(Date.now() - osUptimeSeconds * 1000).toISOString();
  const appStartedAt = new Date(Date.now() - processUptimeSeconds * 1000).toISOString();

  let database: ServiceState = "connected";
  let databaseLatencyMs: number | null = null;
  let counts = {
    users: 0,
    trips: 0,
    bookings: 0,
    notifications: 0,
  };

  try {
    const dbStartedAt = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    databaseLatencyMs = Date.now() - dbStartedAt;
    const [users, trips, bookings, notifications] = await Promise.all([
      prisma.user.count(),
      prisma.trip.count(),
      prisma.booking.count(),
      prisma.notification.count(),
    ]);
    counts = { users, trips, bookings, notifications };
  } catch {
    database = "error";
  }

  const responseTimeMs = Math.max(1, Date.now() - startedAt);
  const appStatus = database === "error" ? "degraded" : "ok";

  return NextResponse.json({
    status: appStatus,
    mode: process.env.NODE_ENV || "development",
    app: "SmartTravel",
    timestamp: new Date().toISOString(),
    serverStartedAt,
    uptimeSeconds: osUptimeSeconds,
    processUptimeSeconds,
    appStartedAt,
    responseTimeMs,
    databaseLatencyMs,
    nodeVersion: process.version,
    services: {
      app: formatServiceState("running"),
      database,
      email: process.env.SMTP_HOST ? formatServiceState("connected") : formatServiceState("not-configured"),
      bookingMode: "external-provider-redirects",
      aiPlanner: "local-ollama-or-fallback",
      uploads: "local-filesystem",
    },
    counts,
    setupHint: database === "error" ? "Database check failed. Run `npx prisma generate` and `npx prisma db push`." : "All core status checks completed.",
  });
}
