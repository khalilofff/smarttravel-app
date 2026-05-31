import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { tripSchema } from "@/lib/validators";
import { getLocalServerSession } from "@/lib/local-auth";

import { logAudit } from "@/lib/services/audit-service";
import { createNotification } from "@/lib/services/notification-service";
import { parseLocalDate, assertDateRange, safeError } from "@/lib/local-demo-guards";

function parsePlannerNotes(notes: unknown) {
  if (typeof notes !== "string" || !notes.trim()) return {} as any;
  try { return JSON.parse(notes); } catch { return {} as any; }
}

function smartBudgetCategories(input: any, totalBudget: number) {
  const budget = input?.aiBudget && typeof input.aiBudget === "object" ? input.aiBudget : null;
  if (!budget) {
    return [
      { category: "ACCOMMODATION", planned: totalBudget * 0.3 },
      { category: "TRANSPORT", planned: totalBudget * 0.2 },
      { category: "FOOD", planned: totalBudget * 0.25 },
      { category: "ACTIVITIES", planned: totalBudget * 0.15 },
      { category: "SHOPPING", planned: totalBudget * 0.05 },
      { category: "MISCELLANEOUS", planned: totalBudget * 0.05 },
    ];
  }
  return [
    { category: "FLIGHTS", planned: Number(budget.flights || 0) },
    { category: "ACCOMMODATION", planned: Number(budget.hotels || 0) },
    { category: "FOOD", planned: Number(budget.food || 0) },
    { category: "TRANSPORT", planned: Number(budget.transport || 0) },
    { category: "ACTIVITIES", planned: Number(budget.activities || 0) },
    { category: "SHOPPING", planned: Number(budget.shopping || 0) },
    { category: "EMERGENCY", planned: Number(budget.emergency || 0) },
  ].filter((x) => Number.isFinite(x.planned) && x.planned >= 0);
}

function selectedFlightPayload(body: any, notes: any) {
  const flight = body?.selectedFlight || notes?.selectedFlight || null;
  if (!flight || typeof flight !== "object") return null;
  return flight;
}

function selectedHotelPayload(body: any, notes: any) {
  const hotel = body?.selectedHotel || notes?.selectedHotel || null;
  if (!hotel || typeof hotel !== "object") return null;
  return hotel;
}

function itineraryPayload(body: any, notes: any) {
  const days = body?.dailyItinerary || notes?.dailyItinerary || [];
  return Array.isArray(days) ? days : [];
}

export async function GET(req: NextRequest) {
  try {
    const session = await getLocalServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: any = {
      OR: [
        { userId },
        { collaborators: { some: { userId, status: "ACCEPTED" } } },
      ],
    };
    if (status && status !== "ALL") where.status = status;
    if (search) where.title = { contains: search };

    const trips = await prisma.trip.findMany({
      where,
      include: {
        destinations: { orderBy: { orderIndex: "asc" } },
        collaborators: { include: { user: { select: { id: true, name: true, email: true, image: true } } } },
        expenses: { select: { id: true, amount: true, currency: true, category: true } },
        _count: { select: { expenses: true, bookings: true, comments: true } },
        itinerary: { select: { id: true, generatedBy: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(trips);
  } catch (error) {
    console.error("Get trips error:", error);
    return NextResponse.json({ error: "Failed to fetch trips" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getLocalServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;
    const body = await req.json();
    const parsed = tripSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return NextResponse.json({
        error: first?.message || "Invalid trip data",
        field: first?.path?.join(".") || null,
        issues: parsed.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })),
      }, { status: 400 });
    }
    const { destinations, ...tripData } = parsed.data;
    const startDate = parseLocalDate(tripData.startDate, "Trip start date");
    const endDate = parseLocalDate(tripData.endDate, "Trip end date");
    assertDateRange(startDate, endDate);
    const tripCost = Number(tripData.totalBudget || 0);
    const plannerNotes = parsePlannerNotes(tripData.notes);
    const budgetCategoryData = smartBudgetCategories(body.aiBudget ? { aiBudget: body.aiBudget } : plannerNotes, tripCost);
    const selectedFlight = selectedFlightPayload(body, plannerNotes);
    const selectedHotel = selectedHotelPayload(body, plannerNotes);
    const aiDays = itineraryPayload(body, plannerNotes);

    const duplicate = await prisma.trip.findFirst({
      where: {
        userId,
        title: tripData.title,
        startDate,
        endDate,
        createdAt: { gte: new Date(Date.now() - 15 * 1000) },
      },
      include: { destinations: true, budgetCategories: true },
    });
    if (duplicate) {
      return NextResponse.json(duplicate, { status: 200, headers: { "X-Local-Demo-Deduped": "true" } });
    }
    // Total budget is used only as a planning constraint. Final purchase happens on external sellers only.

    const trip = await prisma.$transaction(async (tx: any) => {
      const createdTrip = await tx.trip.create({
        data: {
          ...tripData,
          status: "PLANNED",
          startDate,
          endDate,
          userId,
          destinations: {
            create: destinations.map((d: any, i: number) => ({ ...d, orderIndex: i })),
          },
          budgetCategories: {
            create: budgetCategoryData,
          },
        },
        include: { destinations: true, budgetCategories: true },
      });

      if (selectedFlight) {
        await tx.booking.create({
          data: {
            tripId: createdTrip.id,
            userId,
            type: "FLIGHT",
            provider: String(selectedFlight.airline || selectedFlight.source || "Flight provider"),
            bookingRef: String(selectedFlight.flightNumber || selectedFlight.id || "").slice(0, 120) || null,
            url: selectedFlight.bookingUrl || selectedFlight.googleFlightsUrl || null,
            status: "SELECTED",
            amount: Number(selectedFlight.price || 0) || null,
            currency: selectedFlight.currency || tripData.currency || "USD",
            notes: JSON.stringify({
              route: selectedFlight.route,
              outbound: selectedFlight.outbound,
              inbound: selectedFlight.inbound,
              bookingToken: selectedFlight.bookingToken || null,
              departureToken: selectedFlight.departureToken || null,
              originalPrice: selectedFlight.originalPrice || null,
              originalCurrency: selectedFlight.originalCurrency || null,
            }),
          },
        });
      }

      if (selectedHotel) {
        await tx.booking.create({
          data: {
            tripId: createdTrip.id,
            userId,
            type: "HOTEL",
            provider: String(selectedHotel.name || selectedHotel.source || "Hotel provider"),
            bookingRef: String(selectedHotel.hotelId || selectedHotel.id || "").slice(0, 120) || null,
            url: selectedHotel.bookingUrl || selectedHotel.link || null,
            status: "SELECTED",
            checkIn: selectedHotel.checkIn ? parseLocalDate(selectedHotel.checkIn, "Hotel check-in") : startDate,
            checkOut: selectedHotel.checkOut ? parseLocalDate(selectedHotel.checkOut, "Hotel check-out") : endDate,
            amount: Number(selectedHotel.price || 0) || null,
            currency: selectedHotel.currency || tripData.currency || "USD",
            notes: JSON.stringify({
              hotelId: selectedHotel.hotelId || selectedHotel.id || null,
              rating: selectedHotel.rating || selectedHotel.reviewScore || null,
              stars: selectedHotel.stars || null,
              address: selectedHotel.address || null,
              amenities: selectedHotel.amenities || [],
              image: selectedHotel.image || null,
              latitude: selectedHotel.latitude || null,
              longitude: selectedHotel.longitude || null,
            }),
          },
        });
      }

      if (aiDays.length) {
        await tx.itinerary.create({
          data: {
            tripId: createdTrip.id,
            generatedBy: "smarttravel-planner",
            isAccepted: true,
            days: {
              create: aiDays.map((day: any, index: number) => {
                const date = new Date(startDate);
                date.setDate(startDate.getDate() + index);
                return {
                  dayNumber: Number(day.day || index + 1),
                  date,
                  title: String(day.title || `Day ${index + 1}`).slice(0, 200),
                  notes: JSON.stringify({ morning: day.morning, afternoon: day.afternoon, evening: day.evening, places: day.places || [], restaurant: day.restaurant || null, weatherNote: day.weatherNote || null }),
                  dailyCost: Number(day.estimatedDailyCost || 0),
                  items: {
                    create: [
                      { title: String(day.morning || "Morning plan").slice(0, 180), timeSlot: "MORNING", category: "activity", estimatedCost: Math.max(0, Math.round(Number(day.morningCost ?? 0))), currency: tripData.currency || "USD", notes: day.weatherNote || null, orderIndex: 0 },
                      { title: String(day.afternoon || "Afternoon plan").slice(0, 180), timeSlot: "AFTERNOON", category: "activity", estimatedCost: Math.max(0, Math.round(Number(day.afternoonCost ?? 0))), currency: tripData.currency || "USD", notes: day.places?.join(", ") || null, orderIndex: 1 },
                      { title: String(day.evening || "Evening plan").slice(0, 180), timeSlot: "EVENING", category: "food", estimatedCost: Math.max(0, Math.round(Number(day.eveningCost ?? 0) + Number(day.shoppingCost ?? 0))), currency: tripData.currency || "USD", notes: day.restaurant || null, orderIndex: 2 },
                    ],
                  },
                };
              }),
            },
          },
        });
      }

      return createdTrip;
    });

    await logAudit({ userId, tripId: trip.id, action: "TRIP_CREATE", details: trip.title });
    await createNotification({
      userId,
      type: "TRIP",
      title: "Trip Plan Created ✨",
      message: `${trip.title} was saved with a planning budget of $${tripCost.toFixed(2)}.`,
      link: `/trip/${trip.id}`,
    });
    return NextResponse.json(trip, { status: 201 });
  } catch (error) {
    console.error("Create trip error:", error);
    return NextResponse.json({ error: safeError(error, "Could not create trip. Check trip data.") }, { status: 500 });
  }
}
