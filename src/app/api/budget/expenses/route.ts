import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { expenseSchema } from "@/lib/validators";
import { createNotification } from "@/lib/services/notification-service";
import { parsePositiveAmount, parseLocalDate, safeError } from "@/lib/local-demo-guards";
import { getLocalServerSession } from "@/lib/local-auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getLocalServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;
    const body = await req.json();
    const { tripId, ...expenseData } = body;

    if (!tripId) {
      return NextResponse.json({ error: "Trip ID is required" }, { status: 400 });
    }

    const tripAccess = await prisma.trip.findFirst({
      where: {
        id: tripId,
        OR: [
          { userId },
          { collaborators: { some: { userId, role: { in: ["EDITOR", "OWNER"] }, status: "ACCEPTED" } } },
        ],
      },
    });

    if (!tripAccess) {
      return NextResponse.json({ error: "Trip not found or you do not have permission" }, { status: 404 });
    }

    const normalizedExpenseData = {
      ...expenseData,
      amount: parsePositiveAmount(expenseData.amount, "Expense amount", 100000),
      description: String(expenseData.description || `${String(expenseData.category || "MISCELLANEOUS").toLowerCase()} expense`).trim(),
      date: expenseData.date || new Date().toISOString().split("T")[0],
    };

    const parsed = expenseSchema.safeParse(normalizedExpenseData);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid expense data" }, { status: 400 });
    }

    const expense = await prisma.$transaction(async (tx: any) => {
      const created = await tx.expense.create({
        data: { ...parsed.data, date: parseLocalDate(parsed.data.date, "Expense date"), tripId, userId },
        include: { user: { select: { id: true, name: true } } },
      });

      await tx.budgetCategory.updateMany({
        where: { tripId, category: parsed.data.category },
        data: { spent: { increment: parsed.data.amount } },
      });

      await tx.auditLog.create({
        data: {
          userId,
          tripId,
          action: "EXPENSE_ADDED",
          details: `${parsed.data.category}: ${parsed.data.amount} ${parsed.data.currency}`,
        },
      });

      return created;
    });

    // Check budget threshold
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    const totalSpent = await prisma.expense.aggregate({ where: { tripId }, _sum: { amount: true } });
    if (trip && totalSpent._sum.amount) {
      const pct = (totalSpent._sum.amount / trip.totalBudget) * 100;
      if (trip.totalBudget > 0 && pct >= 90) {
        await createNotification({
          userId: trip.userId, type: "BUDGET_WARNING",
          title: "Budget Warning! ⚠️",
          message: `You've spent ${Math.round(pct)}% of your budget for "${trip.title}".`,
          link: `/trip/${tripId}`,
        });
      }
    }

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error("Create expense error:", error);
    return NextResponse.json({ error: safeError(error, "Expense could not be saved. Check amount, date, and category.") }, { status: 500 });
  }
}
