import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getLocalServerSession } from "@/lib/local-auth";

async function currentUserId() {
  const session = await getLocalServerSession();
  return session?.user?.id || null;
}

export async function POST() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isActive: true } });
  if (!user?.isActive) {
    return NextResponse.json({ ok: false, disabled: true, message: "Account disabled" }, { status: 403 });
  }
  await prisma.user.update({ where: { id: userId }, data: { updatedAt: new Date() } });
  return NextResponse.json({ ok: true, online: true });
}

export async function DELETE() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ ok: true });
  const offlineAt = new Date(Date.now() - 10 * 60 * 1000);
  await prisma.user.update({ where: { id: userId }, data: { updatedAt: offlineAt } });
  return NextResponse.json({ ok: true, online: false });
}
