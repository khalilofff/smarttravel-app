import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getLocalServerSession } from "@/lib/local-auth";

export async function GET() {
  const session = await getLocalServerSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { twoFactorEnabled: true } });
  return NextResponse.json({ twoFactorEnabled: !!user?.twoFactorEnabled });
}
