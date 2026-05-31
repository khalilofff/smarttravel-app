import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getLocalServerSession } from "@/lib/local-auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getLocalServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const favorites = await prisma.favoriteDestination.findMany({
      where: { userId: session.user.id },
      include: { destination: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(favorites);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch favorites" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getLocalServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;

    const { destinationCatalogId } = await req.json();
    if (!destinationCatalogId) return NextResponse.json({ error: "Destination ID required" }, { status: 400 });

    // Toggle favorite
    const existing = await prisma.favoriteDestination.findUnique({
      where: { userId_destinationCatalogId: { userId, destinationCatalogId } },
    });

    if (existing) {
      await prisma.favoriteDestination.delete({ where: { id: existing.id } });
      return NextResponse.json({ favorited: false });
    } else {
      await prisma.favoriteDestination.create({ data: { userId, destinationCatalogId } });
      return NextResponse.json({ favorited: true }, { status: 201 });
    }
  } catch (error) {
    console.error("Favorites POST error:", error);
    return NextResponse.json({ error: "Failed to update favorite" }, { status: 500 });
  }
}
