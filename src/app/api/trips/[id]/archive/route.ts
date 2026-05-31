import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getLocalServerSession } from "@/lib/local-auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getLocalServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;

    const trip = await prisma.trip.findFirst({ where: { id: params.id, userId } });
    if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

    const updated = await prisma.trip.update({
      where: { id: params.id },
      data: { status: "ARCHIVED" },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Failed to archive trip" }, { status: 500 });
  }
}
