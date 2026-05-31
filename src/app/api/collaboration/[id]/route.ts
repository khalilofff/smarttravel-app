import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getLocalServerSession } from "@/lib/local-auth";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getLocalServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;

    const collab = await prisma.collaborator.findUnique({ where: { id: params.id }, include: { trip: true } });
    if (!collab) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (collab.trip.userId !== userId) return NextResponse.json({ error: "Only owner can remove collaborators" }, { status: 403 });

    await prisma.collaborator.delete({ where: { id: params.id } });
    return NextResponse.json({ message: "Collaborator removed" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to remove" }, { status: 500 });
  }
}
