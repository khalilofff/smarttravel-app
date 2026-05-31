import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: { role: "USER", isActive: true },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { id: true, name: true, email: true, createdAt: true },
    });
    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ users: [] });
  }
}
