import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { generateBudgetSuggestions } from "@/lib/services/ai-service";
import { getLocalServerSession } from "@/lib/local-auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getLocalServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const tripId = searchParams.get("tripId");
    if (!tripId) return NextResponse.json({ error: "tripId required" }, { status: 400 });

    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

    const totalSpent = await prisma.expense.aggregate({ where: { tripId }, _sum: { amount: true } });
    const spent = totalSpent._sum.amount || 0;

    const budget = Number(trip.totalBudget || 0);
    const suggestions = await generateBudgetSuggestions(tripId, budget, spent, trip.currency);
    const percentage = budget > 0 ? Math.round((spent / budget) * 100) : 0;
    return NextResponse.json({ suggestions, spent, budget, percentage });
  } catch (error) {
    return NextResponse.json({ error: "Failed to get suggestions" }, { status: 500 });
  }
}
