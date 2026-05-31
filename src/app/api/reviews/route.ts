import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getLocalServerSession } from "@/lib/local-auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const destinationId = searchParams.get("destinationId");
    const tripId = searchParams.get("tripId");

    const where: any = { isPublic: true };
    if (destinationId) where.destinationCatalogId = destinationId;
    if (tripId) where.tripId = tripId;

    const reviews = await prisma.review.findMany({
      where,
      include: { user: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(reviews);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getLocalServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;

    const body = await req.json();
    const { destinationCatalogId, tripId, rating, title, content, isPublic } = body;

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }
    if (!destinationCatalogId && !tripId) {
      return NextResponse.json({ error: "Destination or trip ID required" }, { status: 400 });
    }

    // Prevent duplicate reviews for same destination
    if (destinationCatalogId) {
      const existing = await prisma.review.findFirst({
        where: { userId, destinationCatalogId },
      });
      if (existing) {
        // Update existing review instead
        const updated = await prisma.review.update({
          where: { id: existing.id },
          data: { rating, title: title || null, content: content || null, isPublic: isPublic ?? true },
          include: { user: { select: { id: true, name: true, image: true } } },
        });
        return NextResponse.json(updated);
      }
    }

    const review = await prisma.review.create({
      data: {
        userId,
        destinationCatalogId: destinationCatalogId || null,
        tripId: tripId || null,
        rating,
        title: title || null,
        content: content || null,
        isPublic: isPublic ?? true,
      },
      include: { user: { select: { id: true, name: true, image: true } } },
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error("Review POST error:", error);
    return NextResponse.json({ error: "Failed to create review" }, { status: 500 });
  }
}
