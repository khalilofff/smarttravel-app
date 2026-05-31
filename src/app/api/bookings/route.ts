import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { bookingSchema } from "@/lib/validators";
import { createNotification } from "@/lib/services/notification-service";
import { parseOptionalNonNegativeAmount, parseLocalDate, assertDateRange, safeError } from "@/lib/local-demo-guards";
import { getLocalServerSession } from "@/lib/local-auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getLocalServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;

    const body = await req.json();
    const { tripId, ...bookingData } = body;
    bookingData.amount = parseOptionalNonNegativeAmount(bookingData.amount, "Booking amount", 100000) ?? 0;

    const parsed = bookingSchema.safeParse(bookingData);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid booking data" }, { status: 400 });

    const trip = await prisma.trip.findFirst({
      where: { id: tripId, OR: [{ userId }, { collaborators: { some: { userId, status: "ACCEPTED" } } }] },
    });
    if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

    const checkInDate = parsed.data.checkIn ? parseLocalDate(parsed.data.checkIn, "Booking check-in date") : null;
    const checkOutDate = parsed.data.checkOut ? parseLocalDate(parsed.data.checkOut, "Booking check-out date") : null;
    if (checkInDate && checkOutDate) assertDateRange(checkInDate, checkOutDate);

    const duplicateBooking = await prisma.booking.findFirst({
      where: {
        userId, tripId, provider: parsed.data.provider, type: parsed.data.type,
        createdAt: { gte: new Date(Date.now() - 15 * 1000) },
      },
    });
    if (duplicateBooking) return NextResponse.json(duplicateBooking, { status: 200, headers: { "X-Local-Demo-Deduped": "true" } });

    if (parsed.data.checkIn && parsed.data.type === "HOTEL") {
      const conflict = await prisma.booking.findFirst({
        where: {
          tripId, type: "HOTEL", status: { not: "CANCELLED" },
          checkIn: { lte: checkOutDate || checkInDate! },
          checkOut: { gte: checkInDate! },
        },
      });
      if (conflict) return NextResponse.json({ error: "Date conflict with existing hotel booking" }, { status: 409 });
    }

    const amount = parsed.data.amount || 0;

    const booking = await prisma.booking.create({
      data: {
        ...parsed.data,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        url: parsed.data.url || null,
        status: "PENDING",
        tripId, userId,
      },
    });

    // SmartTravel is a planning and redirect platform.
    // It does not sell tickets, charge cards.
    // Manual bookings with amounts are saved as SELECTED records only.
    await prisma.booking.update({ where: { id: booking.id }, data: { status: parsed.data.status || "SELECTED" } });

    await createNotification({
      userId, type: "BOOKING", title: "Booking Saved" ,
      message: `Your ${parsed.data.type.toLowerCase()} option at ${parsed.data.provider} was saved to your trip. Final purchase happens on the external provider site.`,
      link: `/bookings`,
    });

    const finalBooking = await prisma.booking.findUnique({ where: { id: booking.id } });
    return NextResponse.json(finalBooking, { status: 201 });
  } catch (error) {
    console.error("Booking POST error:", error);
    return NextResponse.json({ error: safeError(error, "Could not create booking. Check booking details.") }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getLocalServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const tripId = searchParams.get("tripId");
    const where: any = { userId: session.user.id };
    if (tripId) where.tripId = tripId;
    const bookings = await prisma.booking.findMany({
      where, include: { trip: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(bookings);
  } catch (error) {
    return NextResponse.json({ error: "Could not load bookings from local database." }, { status: 500 });
  }
}
