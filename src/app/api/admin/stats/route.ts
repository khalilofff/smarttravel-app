import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getLocalServerSession } from "@/lib/local-auth";

async function requireAdmin(req: NextRequest) {
  const session = await getLocalServerSession();
  if (!session?.user) return { error: "Unauthorized", status: 401 };
  if (session.user.role !== "MANAGER" && session.user.role !== "SUPER_ADMIN") return { error: "Forbidden", status: 403 };
  return { session };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const [
      totalUsers, activeUsers, totalTrips, totalBookings,
      bookingTotals, tripBudgetTotals, notificationCount, recentUsers, recentBookings,
      usersByMonth, bookingsByStatus,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.trip.count(),
      prisma.booking.count(),
      prisma.booking.aggregate({ _sum: { amount: true } }),
      prisma.trip.aggregate({ _sum: { totalBudget: true } }),
      prisma.notification.count(),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, name: true, email: true, role: true, createdAt: true, isActive: true },
      }),
      prisma.booking.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { user: { select: { name: true, email: true } } },
      }),
      // Users registered in the last 6 months (grouped by month)
      prisma.$queryRaw`
        SELECT strftime('%Y-%m', createdAt) as month, COUNT(*) as count
        FROM User
        WHERE createdAt >= datetime('now', '-6 months')
        GROUP BY month
        ORDER BY month ASC
      `,
      prisma.booking.groupBy({ by: ["status"], _count: { id: true } }),
    ]);

    return NextResponse.json({
      stats: {
        totalUsers,
        activeUsers,
        totalTrips,
        totalBookings,
        totalRevenue: bookingTotals._sum.amount || 0,
        plannedBudget: tripBudgetTotals._sum.totalBudget || 0,
        notifications: notificationCount,
      },
      recentUsers,
      recentBookings,
      usersByMonth,
      bookingsByStatus,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
