import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getLocalServerSession } from "@/lib/local-auth";

export async function getCurrentUser() {
  const session = await getLocalServerSession();
  return session?.user as { id: string; email: string; name: string; role: string; image?: string } | null;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== "MANAGER" && user.role !== "SUPER_ADMIN") redirect("/dashboard");
  return user;
}

/** Use in API routes: returns userId or a 401 response */
export async function getApiUser(): Promise<{ id: string; email: string; name: string; role: string } | null> {
  const session = await getLocalServerSession();
  if (!session?.user) return null;
  return session.user as { id: string; email: string; name: string; role: string };
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
