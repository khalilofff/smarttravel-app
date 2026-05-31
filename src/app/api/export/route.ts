import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getLocalServerSession } from "@/lib/local-auth";

export async function GET(req: NextRequest) {
  const session = await getLocalServerSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { searchParams } = new URL(req.url);
  const tripId = searchParams.get("tripId");
  const format = searchParams.get("format") || "json";

  if (!tripId) return NextResponse.json({ error: "tripId required" }, { status: 400 });

  const trip = await prisma.trip.findFirst({
    where: { id: tripId, OR: [{ userId }, { collaborators: { some: { userId, status: "ACCEPTED" } } }] },
    include: {
      destinations: true,
      itinerary: { include: { days: { include: { items: true }, orderBy: { dayNumber: "asc" } } } },
      expenses: { include: { user: { select: { name: true } } } },
      bookings: true,
      collaborators: { include: { user: { select: { name: true, email: true } } } },
      budgetCategories: true,
    },
  });

  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  if (format === "csv") {
    const rows = [["Date", "Description", "Category", "Amount", "Currency", "Payer"]];
    if (trip.expenses.length === 0) rows.push(["", "No expenses recorded", "", "0", trip.currency, ""]);
    trip.expenses.forEach((e: any) => {
      rows.push([formatDate(e.date), e.description, e.category, String(e.amount), e.currency, e.user?.name || ""]);
    });
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="${trip.title}-expenses.csv"` } });
  }

  // Return full JSON for client-side PDF generation
  const totalSpent = trip.expenses.reduce((s: number, e: any) => s + e.amount, 0);
  const primaryDest = trip.destinations[0];
  return NextResponse.json({
    trip: {
      title: trip.title,
      description: trip.description,
      destination: primaryDest
        ? `${primaryDest.name}, ${primaryDest.country}`
        : "No destination",
      dates: `${formatDate(trip.startDate)} – ${formatDate(trip.endDate)}`,
      budget: formatCurrency(trip.totalBudget, trip.currency),
      spent: formatCurrency(totalSpent, trip.currency),
      travelers: trip.travelerCount,
      style: trip.travelStyle,
      status: trip.status,
    },
    itinerary: (trip.itinerary?.days.length ? trip.itinerary.days.map((d: any) => ({
      day: d.dayNumber,
      title: d.title,
      date: formatDate(d.date),
      items: d.items.map((i: any) => ({
        time: i.startTime || i.timeSlot,
        title: i.title,
        cost: formatCurrency(i.estimatedCost, trip.currency),
        status: i.status,
      })),
    })) : [{ day: 1, title: "No itinerary generated yet", date: "", items: [] }]),
    budget: (trip.budgetCategories.length ? trip.budgetCategories : [{ category: "TOTAL", planned: trip.totalBudget, spent: totalSpent }]).map((c: any) => ({
      category: c.category,
      planned: formatCurrency(c.planned, trip.currency),
      spent: formatCurrency(c.spent, trip.currency),
    })),
    bookings: trip.bookings.length ? trip.bookings.map((b: any) => ({
      type: b.type,
      provider: b.provider,
      ref: b.bookingRef,
      status: b.status,
      dates: b.checkIn ? formatDate(b.checkIn) : "",
    })) : [{ type: "", provider: "No bookings yet", ref: "", status: "", dates: "" }],
    collaborators: trip.collaborators.map((c: any) => ({
      name: c.user.name,
      email: c.user.email,
      role: c.role,
    })),
  });
}
