import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const dest = await prisma.destinationCatalog.findUnique({ where: { id: params.id } });
    if (!dest) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Find similar destinations (same city or category)
    const similar = await prisma.destinationCatalog.findMany({
      where: { id: { not: dest.id }, OR: [{ city: dest.city }, { category: dest.category }], isActive: true },
      take: 4,
    });

    return NextResponse.json({ ...dest, similar });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
