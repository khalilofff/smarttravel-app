import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getLocalServerSession } from "@/lib/local-auth";

// Returns all pending invitations sent TO the current user
export async function GET(req: NextRequest) {
  try {
    const session = await getLocalServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;

    const pending = await prisma.collaborator.findMany({
      where: { userId, status: "PENDING" },
      include: {
        trip: {
          select: {
            id: true,
            title: true,
            status: true,
            destinations: { select: { name: true, country: true }, take: 1 },
            user: { select: { id: true, name: true, email: true, image: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(pending);
  } catch (error) {
    console.error("Pending invitations error:", error);
    return NextResponse.json({ error: "Failed to fetch invitations" }, { status: 500 });
  }
}
