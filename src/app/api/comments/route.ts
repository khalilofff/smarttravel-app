import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { commentSchema } from "@/lib/validators";
import { notifyCollaborators } from "@/lib/services/notification-service";
import { getLocalServerSession } from "@/lib/local-auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getLocalServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;
    const body = await req.json();
    const parsed = commentSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });

    const comment = await prisma.comment.create({
      data: { ...parsed.data, userId },
      include: { user: { select: { id: true, name: true, image: true } } },
    });

    if (parsed.data.tripId) {
      await notifyCollaborators(
        parsed.data.tripId, userId, "COMMENT_RECEIVED",
        "New Comment 💬", `${session.user.name} commented on the trip.`
      );
    }
    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to add comment" }, { status: 500 });
  }
}
