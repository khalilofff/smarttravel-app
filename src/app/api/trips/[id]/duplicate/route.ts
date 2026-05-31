import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getLocalServerSession } from "@/lib/local-auth";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getLocalServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;

    const original = await prisma.trip.findFirst({
      where: { id: params.id, userId },
      include: { destinations: true, budgetCategories: true },
    });
    if (!original) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

    const copy = await prisma.trip.create({
      data: {
        title: `${original.title} (Copy)`,
        description: original.description,
        startDate: original.startDate,
        endDate: original.endDate,
        status: "DRAFT",
        totalBudget: original.totalBudget,
        currency: original.currency,
        travelerCount: original.travelerCount,
        notes: original.notes,
        travelStyle: original.travelStyle,
        isPublic: false,
        userId,
        destinations: {
          create: original.destinations.map((d: any) => ({
            name: d.name, country: d.country, latitude: d.latitude,
            longitude: d.longitude, orderIndex: d.orderIndex,
          })),
        },
        budgetCategories: {
          create: original.budgetCategories.map((c: any) => ({
            category: c.category, planned: c.planned, spent: 0,
          })),
        },
      },
      include: { destinations: true },
    });

    return NextResponse.json(copy, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to duplicate trip" }, { status: 500 });
  }
}
