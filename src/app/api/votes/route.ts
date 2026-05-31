import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getLocalServerSession } from "@/lib/local-auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getLocalServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;
    const { itineraryItemId, value = 1 } = await req.json();
    if (!itineraryItemId) return NextResponse.json({ error: "Item ID required" }, { status: 400 });

    const existing = await prisma.vote.findUnique({
      where: { userId_itineraryItemId: { userId, itineraryItemId } },
    });

    if (existing) {
      if (existing.value === value) {
        await prisma.vote.delete({ where: { id: existing.id } });
        return NextResponse.json({ action: "removed" });
      }
      const updated = await prisma.vote.update({ where: { id: existing.id }, data: { value } });
      return NextResponse.json({ action: "updated", vote: updated });
    }

    const vote = await prisma.vote.create({ data: { userId, itineraryItemId, value } });
    return NextResponse.json({ action: "created", vote }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to vote" }, { status: 500 });
  }
}
