import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { createNotification } from "@/lib/services/notification-service";
import { sendTripInviteEmail } from "@/lib/services/email-service";
import { getLocalServerSession } from "@/lib/local-auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getLocalServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;
    const { tripId, email, role = "VIEWER" } = await req.json();
    if (!tripId || !email) return NextResponse.json({ error: "Trip ID and email required" }, { status: 400 });

    const trip = await prisma.trip.findFirst({ where: { id: tripId, userId } });
    if (!trip) return NextResponse.json({ error: "Trip not found or unauthorized" }, { status: 404 });

    const invitee = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!invitee) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (invitee.id === userId) return NextResponse.json({ error: "Cannot invite yourself" }, { status: 400 });

    const existing = await prisma.collaborator.findUnique({
      where: { tripId_userId: { tripId, userId: invitee.id } },
    });
    if (existing) return NextResponse.json({ error: "User already invited" }, { status: 409 });

    const collab = await prisma.collaborator.create({
      data: { tripId, userId: invitee.id, role: role as any, invitedById: userId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    await createNotification({
      userId: invitee.id, type: "TRIP_INVITE",
      title: "Trip Invitation 🎒",
      message: `${session.user.name} invited you to collaborate on "${trip.title}".`,
      link: `/trip/${tripId}`,
    });

    await sendTripInviteEmail(invitee.email, trip.title, session.user.name || "Someone");
    return NextResponse.json(collab, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to invite collaborator" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getLocalServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;
    const { collaboratorId, status, role } = await req.json();

    const collab = await prisma.collaborator.findUnique({ where: { id: collaboratorId } });
    if (!collab) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Only the invited user can accept/decline, only trip owner can change role
    const data: any = {};
    if (status && collab.userId === userId) data.status = status;
    if (role) {
      const trip = await prisma.trip.findUnique({ where: { id: collab.tripId } });
      if (trip?.userId !== userId) return NextResponse.json({ error: "Only owner can change roles" }, { status: 403 });
      data.role = role;
    }

    const updated = await prisma.collaborator.update({ where: { id: collaboratorId }, data });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
