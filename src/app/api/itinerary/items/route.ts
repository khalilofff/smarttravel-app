import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getLocalServerSession } from "@/lib/local-auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getLocalServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { dayId, title, description, timeSlot, startTime, endTime, estimatedCost, category, location } = body;

    if (!dayId || !title) return NextResponse.json({ error: "dayId and title required" }, { status: 400 });

    // Get max orderIndex for the day
    const lastItem = await prisma.itineraryItem.findFirst({
      where: { dayId },
      orderBy: { orderIndex: "desc" },
    });
    const orderIndex = (lastItem?.orderIndex ?? -1) + 1;

    const item = await prisma.itineraryItem.create({
      data: {
        dayId,
        title,
        description: description || "",
        location: location || "",
        timeSlot: timeSlot || "MORNING",
        startTime: startTime || "",
        endTime: endTime || "",
        estimatedCost: estimatedCost || 0,
        category: category || "activity",
        tags: "[]",
        orderIndex,
        status: "PLANNED",
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to add item" }, { status: 500 });
  }
}
