import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getLocalServerSession } from "@/lib/local-auth";

export async function GET(req: NextRequest) {
  const session = await getLocalServerSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, image: true, role: true, sessionDays: true, createdAt: true, preference: true },
  });
  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const session = await getLocalServerSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const body = await req.json();

  if (body.preferences) {
    await prisma.userPreference.upsert({
      where: { userId },
      update: body.preferences,
      create: { userId, ...body.preferences },
    });
    return NextResponse.json({ success: true });
  }

  if (Object.prototype.hasOwnProperty.call(body, "sessionDays")) {
    const allowed = [30, 90, 120];
    const sessionDays = Number(body.sessionDays);
    if (!allowed.includes(sessionDays)) {
      return NextResponse.json({ error: "Session duration must be 30, 90, or 120 days" }, { status: 400 });
    }
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { sessionDays },
      select: { id: true, sessionDays: true },
    });
    return NextResponse.json({ success: true, ...updated, message: "Session duration saved. Sign out and back in to apply it to the current login token." });
  }

  if (Object.prototype.hasOwnProperty.call(body, "image")) {
    const updated = await prisma.user.update({ where: { id: userId }, data: { image: body.image || null }, select: { id: true, image: true } });
    return NextResponse.json(updated);
  }

  const { name, email } = body;
  if (email) {
    const existing = await prisma.user.findFirst({ where: { email, id: { not: userId } } });
    if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { ...(name && { name }), ...(email && { email }) },
    select: { id: true, name: true, email: true },
  });
  return NextResponse.json(updated);
}
