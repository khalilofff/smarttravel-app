import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    mode: "local-demo",
    app: "SmartTravel",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    services: {
      app: "running",
      database: "checked-by-prisma-routes",
      email: "auto-verified-local-register",
      bookingMode: "external-provider-redirects",
      aiPlanner: "local-ollama-or-fallback",
      uploads: "local-filesystem",
    },
    setupHint: "If database routes fail, run `npm run repair` or `npm run setup1` to regenerate Prisma and sync SQLite.",
  });
}
