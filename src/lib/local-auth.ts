import { cookies, headers } from "next/headers";
import { getServerSession } from "next-auth/next";
import { buildAuthOptions } from "@/lib/auth";

export const LOCAL_SESSION_HEADER = "x-smarttravel-session-slot";

export function normalizeLocalSlot(slot?: string | null) {
  const cleaned = (slot || process.env.NEXTAUTH_COOKIE_PREFIX || "smarttravel-local")
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .slice(0, 80);
  return cleaned || "smarttravel-local";
}

export function inferLocalSlotFromCookieHeader(cookieHeader?: string | null) {
  if (!cookieHeader) return null;

  const activeSlot = cookieHeader.match(/(?:^|;\s*)smarttravel-active-slot=([^;]+)/)?.[1];
  if (activeSlot) {
    try { return normalizeLocalSlot(decodeURIComponent(activeSlot)); } catch { return normalizeLocalSlot(activeSlot); }
  }

  // Match dynamic NextAuth cookie names, e.g.
  // smarttravel-tab-abc.next-auth.session-token=...
  const sessionCookie = cookieHeader.match(/(?:^|;\s*)(smarttravel-[^=;]+)\.next-auth\.session-token=/)?.[1];
  if (sessionCookie) return normalizeLocalSlot(sessionCookie);

  return null;
}

export function getLocalSessionSlotFromHeaders() {
  try {
    const headerSlot = headers().get(LOCAL_SESSION_HEADER);
    if (headerSlot) return normalizeLocalSlot(headerSlot);

    const active = cookies().get("smarttravel-active-slot")?.value;
    if (active) return normalizeLocalSlot(active);

    // Server components do not always receive the custom fetch header on first render.
    // Fall back to the actual NextAuth cookie name so mobile refresh/pull-to-refresh stays logged in.
    const cookieHeader = headers().get("cookie");
    return inferLocalSlotFromCookieHeader(cookieHeader) || normalizeLocalSlot(null);
  } catch {
    return normalizeLocalSlot(null);
  }
}

export async function getLocalServerSession() {
  return getServerSession(buildAuthOptions(getLocalSessionSlotFromHeaders()));
}
