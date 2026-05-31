import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const LOCAL_SESSION_HEADER = "x-smarttravel-session-slot";

// Local demo project: rate limiting must not block repeated login/testing
// when admin, manager and many users are being opened side-by-side.
function isLocalDemoRequest(req: NextRequest): boolean {
  const host = req.headers.get("host") || "";
  const explicitlyEnabled = process.env.LOCAL_RATE_LIMITS === "true";
  if (explicitlyEnabled) return false;
  return host.startsWith("localhost") || host.startsWith("127.0.0.1") || process.env.NODE_ENV === "development";
}

function normalizeLocalSlot(slot?: string | null) {
  const cleaned = (slot || process.env.NEXTAUTH_COOKIE_PREFIX || "smarttravel-local")
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .slice(0, 80);
  return cleaned || "smarttravel-local";
}

function cookieNameForSlot(slot?: string | null) {
  const safe = normalizeLocalSlot(slot);
  const prefix = safe.startsWith("smarttravel-") ? safe : `smarttravel-${safe}`;
  return `${prefix}.next-auth.session-token`;
}

function checkRateLimit(key: string, limit: number, windowSecs: number): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowSecs * 1000 });
    return true;
  }
  entry.count++;
  return entry.count <= limit;
}

const SUPER_ADMIN_ONLY_ROUTES = [
  "/admin/system",
  "/admin/notifications",
];

function isSuperAdminOnly(pathname: string): boolean {
  return SUPER_ADMIN_ONLY_ROUTES.some((r) => pathname.startsWith(r));
}

function isAdminRoute(pathname: string): boolean {
  return pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
}

function isProtectedApi(pathname: string): boolean {
  return pathname.startsWith("/api/bookings") || pathname.startsWith("/api/admin");
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  const localDemo = isLocalDemoRequest(req);

  if (!localDemo && pathname.startsWith("/api/auth/")) {
    const key = `rl:auth:${ip}`;
    if (!checkRateLimit(key, 200, 60)) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }
  }

  // Page navigations cannot carry a per-tab header. For the local multi-login demo,
  // page access is allowed and real authorization is enforced on API calls.
  if (!pathname.startsWith("/api/")) {
    const res = NextResponse.next();
    res.headers.set("X-Content-Type-Options", "nosniff");
    res.headers.set("X-Frame-Options", "DENY");
    res.headers.set("X-XSS-Protection", "1; mode=block");
    res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    return res;
  }

  const slot = req.headers.get(LOCAL_SESSION_HEADER);
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET, cookieName: cookieNameForSlot(slot) });
  const role = token?.role as string | undefined;

  if (!localDemo && pathname.startsWith("/api/bookings")) {
    const userId = token?.id || ip;
    const key = `rl:booking:${userId}`;
    if (!checkRateLimit(key, 300, 60)) {
      return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
    }
  }

  if (isProtectedApi(pathname) && !token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (token?.sessionExpired) {
    return NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401 });
  }

  if (isSuperAdminOnly(pathname) && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 });
  }

  if (isAdminRoute(pathname) && role !== "MANAGER" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const res = NextResponse.next();
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-XSS-Protection", "1; mode=block");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return res;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/trips/:path*",
    "/trip/:path*",
    "/planner/:path*",
    "/budget/:path*",
    "/bookings/:path*",
    "/collaboration/:path*",
    "/export/:path*",
    "/notifications/:path*",
    "/activity/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/map/:path*",
    "/destinations/:path*",
    "/admin/:path*",
    "/api/bookings/:path*",
    "/api/admin/:path*",
    "/api/auth/:path*",
  ],
};
