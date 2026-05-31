import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getLocalServerSession } from "@/lib/local-auth";

export async function GET() {
  const session = await getLocalServerSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const bookings = await prisma.booking.findMany({
    where: { userId },
    include: { trip: { select: { id: true, title: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    bookings.map((b: any) => ({ ...b, tripTitle: b.trip.title, tripId: b.tripId }))
  );
}
