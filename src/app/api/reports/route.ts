import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getLocalServerSession } from "@/lib/local-auth";

async function buildReportPreview(report: any) {
  try {
    if (report.targetType === "TRIP") {
      const trip = await prisma.trip.findUnique({ where: { id: report.targetId }, select: { title: true, status: true, travelStyle: true, user: { select: { name: true, email: true } } } });
      if (!trip) return { title: "Trip not found", content: "The target trip may have been deleted.", owner: null };
      return { title: trip.title, content: `Status: ${trip.status} · Style: ${trip.travelStyle}`, owner: trip.user?.name || trip.user?.email || "Unknown owner" };
    }
    if (report.targetType === "COMMENT") {
      const comment = await prisma.comment.findUnique({ where: { id: report.targetId }, select: { content: true, trip: { select: { title: true } }, user: { select: { name: true, email: true } } } });
      if (!comment) return { title: "Comment not found", content: "The target comment may have been deleted.", owner: null };
      return { title: comment.trip?.title ? `Comment on ${comment.trip.title}` : "Comment", content: comment.content, owner: comment.user?.name || comment.user?.email || "Unknown author" };
    }
    if (report.targetType === "REVIEW") {
      const review = await prisma.review.findUnique({ where: { id: report.targetId }, select: { rating: true, title: true, content: true, destination: { select: { name: true, city: true, country: true } }, user: { select: { name: true, email: true } } } });
      if (!review) return { title: "Review not found", content: "The target review may have been deleted.", owner: null };
      return { title: review.title || `${review.rating}/5 review for ${review.destination?.name || "destination"}`, content: review.content || `Rating: ${review.rating}/5`, owner: review.user?.name || review.user?.email || "Unknown reviewer", destination: review.destination ? `${review.destination.name}, ${review.destination.city}, ${review.destination.country}` : null };
    }
  } catch {}
  return { title: "Preview unavailable", content: "Could not load target preview.", owner: null };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getLocalServerSession();
    if (!session?.user || session.user.role !== "MANAGER" && session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "PENDING";
    const where: any = {};
    if (status !== "ALL") where.status = status;
    const reports = await prisma.contentReport.findMany({ where, include: { reporter: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
    const withPreview = await Promise.all(reports.map(async (r: any) => ({ ...r, targetPreview: await buildReportPreview(r) })));
    return NextResponse.json(withPreview);
  } catch { return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getLocalServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { targetType, targetId, reason, details } = await req.json();
    if (!targetType || !targetId || !reason) return NextResponse.json({ error: "targetType, targetId, reason required" }, { status: 400 });
    if (!["REVIEW", "COMMENT", "TRIP"].includes(targetType)) return NextResponse.json({ error: "Invalid targetType" }, { status: 400 });
    if (!["SPAM", "INAPPROPRIATE", "OFFENSIVE", "OTHER"].includes(reason)) return NextResponse.json({ error: "Invalid reason" }, { status: 400 });
    if (targetType === "TRIP" && !(await prisma.trip.findUnique({ where: { id: targetId }, select: { id: true } }))) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    if (targetType === "COMMENT" && !(await prisma.comment.findUnique({ where: { id: targetId }, select: { id: true } }))) return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    if (targetType === "REVIEW" && !(await prisma.review.findUnique({ where: { id: targetId }, select: { id: true } }))) return NextResponse.json({ error: "Review not found" }, { status: 404 });
    const existing = await prisma.contentReport.findFirst({ where: { reporterId: session.user.id, targetType, targetId, status: { not: "DISMISSED" } } });
    if (existing) return NextResponse.json({ error: "You already reported this content" }, { status: 409 });
    const report = await prisma.contentReport.create({ data: { reporterId: session.user.id, targetType, targetId, reason, details: details || null } });
    console.log(`[REPORT] ${targetType} ${targetId} reported by ${session.user.email} — ${reason}`);
    return NextResponse.json(report, { status: 201 });
  } catch (error) { console.error("Report POST error:", error); return NextResponse.json({ error: "Failed to submit report" }, { status: 500 }); }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getLocalServerSession();
    if (!session?.user || session.user.role !== "MANAGER" && session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    const { reportId, status, action } = await req.json();
    if (!reportId || !status) return NextResponse.json({ error: "reportId and status required" }, { status: 400 });
    if (!["PENDING", "RESOLVED", "DISMISSED"].includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    if (action && !["NONE", "REMOVE_TARGET"].includes(action)) return NextResponse.json({ error: "Invalid moderation action" }, { status: 400 });

    const report = await prisma.contentReport.findUnique({ where: { id: reportId } });
    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

    let actionResult: any = null;
    if (action === "REMOVE_TARGET") {
      if (report.targetType === "TRIP") {
        actionResult = await prisma.trip.update({ where: { id: report.targetId }, data: { status: "ARCHIVED", isPublic: false } }).catch(() => null);
      } else if (report.targetType === "COMMENT") {
        actionResult = await prisma.comment.delete({ where: { id: report.targetId } }).catch(() => null);
      } else if (report.targetType === "REVIEW") {
        actionResult = await prisma.review.update({ where: { id: report.targetId }, data: { isPublic: false } }).catch(() => null);
      }
    }

    const updated = await prisma.contentReport.update({
      where: { id: reportId },
      data: { status, resolvedAt: status !== "PENDING" ? new Date() : null, resolvedBy: status !== "PENDING" ? session.user.id : null },
    });

    if (status !== "PENDING") {
      if (session.user.role === "SUPER_ADMIN") {
        await prisma.adminActionLog.create({ data: { adminId: session.user.id, action: `MODERATION_${status}`, targetType: report.targetType, targetId: report.targetId, details: action === "REMOVE_TARGET" ? "Resolved and removed/archived target content" : "Resolved moderation report" } }).catch(() => null);
      } else {
        await prisma.managerActionLog.create({ data: { managerId: session.user.id, action: `MODERATION_${status}`, targetType: report.targetType, targetId: report.targetId, details: action === "REMOVE_TARGET" ? "Resolved and removed/archived target content" : "Resolved moderation report" } }).catch(() => null);
      }
    }

    return NextResponse.json({ ...updated, actionResult: action === "REMOVE_TARGET" ? Boolean(actionResult) : null });
  } catch (error) { console.error("Report PATCH error:", error); return NextResponse.json({ error: "Failed to update report" }, { status: 500 }); }
}
