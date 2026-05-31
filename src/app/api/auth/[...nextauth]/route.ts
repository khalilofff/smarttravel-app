import NextAuth from "next-auth";
import { buildAuthOptions } from "@/lib/auth";
import { inferLocalSlotFromCookieHeader, normalizeLocalSlot, LOCAL_SESSION_HEADER } from "@/lib/local-auth";

function handlerFor(req: Request) {
  const headerSlot = req.headers.get(LOCAL_SESSION_HEADER);
  const slot = headerSlot
    ? normalizeLocalSlot(headerSlot)
    : (inferLocalSlotFromCookieHeader(req.headers.get("cookie")) || normalizeLocalSlot(null));
  return NextAuth(buildAuthOptions(slot));
}

export async function GET(req: Request, ctx: any) {
  return handlerFor(req)(req, ctx);
}

export async function POST(req: Request, ctx: any) {
  return handlerFor(req)(req, ctx);
}
