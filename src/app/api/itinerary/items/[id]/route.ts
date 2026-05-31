import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getLocalServerSession } from "@/lib/local-auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getLocalServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const item = await prisma.itineraryItem.update({
      where: { id: params.id },
      data: body,
    });
    return NextResponse.json(item);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getLocalServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const item = await prisma.itineraryItem.findUnique({
      where: { id: params.id },
      include: { day: { include: { itinerary: { include: { trip: true } } } } },
    });
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    const trip = item.day.itinerary.trip;
    const canEdit = trip.userId === session.user.id || session.user.role === "MANAGER" || session.user.role === "SUPER_ADMIN" || !!(await prisma.collaborator.findFirst({
      where: { tripId: trip.id, userId: session.user.id, status: "ACCEPTED", role: { in: ["EDITOR", "OWNER"] } },
    }));
    if (!canEdit) return NextResponse.json({ error: "You do not have permission to remove this itinerary item" }, { status: 403 });

    const estimatedAmount = Math.max(0, Number(item.estimatedCost || 0));

    await prisma.$transaction([
      prisma.itineraryDay.update({
        where: { id: item.dayId },
        data: { dailyCost: { decrement: estimatedAmount } },
      }),
      prisma.budgetCategory.updateMany({
        where: { tripId: trip.id, category: item.category },
        data: { spent: { decrement: estimatedAmount } },
      }),
      prisma.itineraryItem.delete({ where: { id: params.id } }),
    ]);

    return NextResponse.json({ message: "Item deleted", estimateOnly: true });
  } catch (error) {
    console.error("Delete itinerary item error:", error);
    return NextResponse.json({ error: "Could not remove this item. Please try again." }, { status: 500 });
  }
}
