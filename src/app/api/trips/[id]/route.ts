import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getLocalServerSession } from "@/lib/local-auth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getLocalServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;
    const trip = await prisma.trip.findFirst({
      where: {
        id: params.id,
        OR: [
          { userId },
          { collaborators: { some: { userId, status: "ACCEPTED" } } },
          { isPublic: true },
        ],
      },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
        destinations: { orderBy: { orderIndex: "asc" } },
        itinerary: {
          include: {
            days: {
              orderBy: { dayNumber: "asc" },
              include: {
                items: {
                  orderBy: { orderIndex: "asc" },
                  include: {
                    votes: true,
                    comments: { include: { user: { select: { id: true, name: true, image: true } } }, orderBy: { createdAt: "desc" } },
                  },
                },
              },
            },
          },
        },
        expenses: { include: { user: { select: { id: true, name: true } } }, orderBy: { date: "desc" } },
        budgetCategories: true,
        collaborators: {
          include: { user: { select: { id: true, name: true, email: true, image: true } } },
        },
        bookings: { orderBy: { checkIn: "asc" } },
        comments: {
          where: { itineraryItemId: null },
          include: {
            user: { select: { id: true, name: true, image: true } },
            replies: { include: { user: { select: { id: true, name: true, image: true } } } },
          },
          orderBy: { createdAt: "desc" },
        },
        _count: { select: { expenses: true, bookings: true, comments: true } },
      },
    });
    if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    return NextResponse.json(trip);
  } catch (error) {
    console.error("Get trip error:", error);
    return NextResponse.json({ error: "Failed to fetch trip" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getLocalServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;
    const trip = await prisma.trip.findFirst({
      where: { id: params.id, OR: [{ userId }, { collaborators: { some: { userId, role: { in: ["EDITOR", "OWNER"] }, status: "ACCEPTED" } } }] },
    });
    if (!trip) return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
    const body = await req.json();
    const { destinations, ...updateData } = body;
    if (updateData.startDate) {
      const d = new Date(updateData.startDate);
      if (!isNaN(d.getTime())) updateData.startDate = d;
      else delete updateData.startDate;
    }
    if (updateData.endDate) {
      const d = new Date(updateData.endDate);
      if (!isNaN(d.getTime())) updateData.endDate = d;
      else delete updateData.endDate;
    }
    if (updateData.endDate && updateData.startDate && updateData.endDate < updateData.startDate) {
      return NextResponse.json({ error: "End date must be after start date" }, { status: 400 });
    }
    const updated = await prisma.trip.update({
      where: { id: params.id },
      data: updateData,
      include: { destinations: true },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update trip error:", error);
    return NextResponse.json({ error: "Failed to update trip" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getLocalServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;
    const role = session.user.role;
    const trip = await prisma.trip.findUnique({ where: { id: params.id } });
    if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (trip.userId !== userId && role !== "MANAGER" && role !== "SUPER_ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    await prisma.trip.delete({ where: { id: params.id } });
    await prisma.notification.create({ data: { userId: trip.userId, type: "TRIP", title: "Trip deleted", message: `${trip.title} was deleted.`, link: "/trips" } }).catch(() => null);
    return NextResponse.json({ message: "Trip deleted" });
  } catch (error) {
    console.error("Delete trip error:", error);
    return NextResponse.json({ error: "Failed to delete trip" }, { status: 500 });
  }
}
