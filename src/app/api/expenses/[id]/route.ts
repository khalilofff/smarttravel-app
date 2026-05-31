import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getLocalServerSession } from "@/lib/local-auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getLocalServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;
    const body = await req.json();

    const expense = await prisma.expense.findFirst({ where: { id: params.id, userId } });
    if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data: any = {};
    if (body.amount !== undefined) data.amount = body.amount;
    if (body.category !== undefined) data.category = body.category;
    if (body.description !== undefined) data.description = body.description;
    if (body.date !== undefined) data.date = new Date(body.date);
    if (body.notes !== undefined) data.notes = body.notes;

    if (body.amount !== undefined && body.amount !== expense.amount) {
      const diff = body.amount - expense.amount;
      await prisma.budgetCategory.updateMany({
        where: { tripId: expense.tripId, category: expense.category },
        data: { spent: { increment: diff } },
      });
    }

    const updated = await prisma.expense.update({ where: { id: params.id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getLocalServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;
    const expense = await prisma.expense.findFirst({ where: { id: params.id, userId } });
    if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.$transaction([
      prisma.budgetCategory.updateMany({ where: { tripId: expense.tripId, category: expense.category }, data: { spent: { decrement: expense.amount } } }),
      prisma.expense.delete({ where: { id: params.id } }),
    ]);
    return NextResponse.json({ message: "Expense deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
