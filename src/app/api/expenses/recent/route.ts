import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getLocalServerSession } from "@/lib/local-auth";

export async function GET() {
  const session = await getLocalServerSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const expenses = await prisma.expense.findMany({
    where: { userId },
    include: { trip: { select: { id: true, title: true, currency: true } } },
    orderBy: { date: "desc" },
    take: 8,
  });

  return NextResponse.json(expenses);
}
