import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getLocalServerSession } from "@/lib/local-auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getLocalServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;
    const body = await req.json();

    const booking = await prisma.booking.findFirst({ where: { id: params.id, userId } });
    if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data: any = {};
    if (body.type !== undefined) data.type = body.type;
    if (body.provider !== undefined) data.provider = body.provider;
    if (body.bookingRef !== undefined) data.bookingRef = body.bookingRef;
    if (body.url !== undefined) data.url = body.url || null;
    if (body.status !== undefined) data.status = body.status;
    if (body.notes !== undefined) data.notes = body.notes;
    if (body.amount !== undefined) data.amount = body.amount;
    if (body.checkIn !== undefined) data.checkIn = body.checkIn ? new Date(body.checkIn) : null;
    if (body.checkOut !== undefined) data.checkOut = body.checkOut ? new Date(body.checkOut) : null;

    const updated = await prisma.booking.update({ where: { id: params.id }, data });
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
    const booking = await prisma.booking.findFirst({ where: { id: params.id, userId } });
    if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.booking.delete({ where: { id: params.id } });
    await prisma.notification.create({
      data: { userId, type: "BOOKING", title: "Booking removed", message: `${booking.provider} was removed from your trip plan.`, link: `/trip/${booking.tripId}` },
    }).catch(() => null);
    return NextResponse.json({ message: "Booking removed" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
