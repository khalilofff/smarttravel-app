import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getLocalServerSession } from "@/lib/local-auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getLocalServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const booking = await prisma.booking.findFirst({ where: { id: params.id, userId: session.user.id } });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    const updated = await prisma.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED" } });
    await prisma.notification.create({ data: { userId: session.user.id, type: "BOOKING", title: "Booking cancelled", message: `${booking.provider} was cancelled in your plan.`, link: `/trip/${booking.tripId}` } }).catch(() => null);
    return NextResponse.json({ booking: updated, message: "Booking cancelled" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to cancel booking" }, { status: 500 });
  }
}
