import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getLocalServerSession } from "@/lib/local-auth";

type AdminSession = { id: string; role: string; name?: string | null; email?: string | null };

async function requireAdminOrManagerOrSuperAdmin(): Promise<AdminSession | null> {
  const session = await getLocalServerSession();
  if (!session?.user) return null;
  if (session.user.role !== "MANAGER" && session.user.role !== "SUPER_ADMIN") return null;
  return session.user as AdminSession;
}

async function requireSuperAdmin(): Promise<AdminSession | null> {
  const session = await getLocalServerSession();
  if (!session?.user) return null;
  if (session.user.role !== "SUPER_ADMIN") return null;
  return session.user as AdminSession;
}

function contains(q: string) {
  return { contains: q };
}

function normCount(rows: any[]) {
  return rows.map((r) => ({
    ...r,
    _count: typeof r._count === "number" ? r._count : (r._count?._all ?? r._count?.id ?? r._count?.name ?? 0),
  }));
}

// Log action: SUPER_ADMIN -> adminActionLog, MANAGER -> managerActionLog
async function logAction(
  actor: AdminSession,
  action: string,
  targetType?: string,
  targetId?: string,
  details?: string
) {
  if (actor.role === "SUPER_ADMIN") {
    await prisma.adminActionLog.create({
      data: { adminId: actor.id, action, targetType, targetId, details, actorRole: "SUPER_ADMIN" },
    });
  } else {
    await prisma.managerActionLog.create({
      data: { managerId: actor.id, action, targetType, targetId, details },
    });
  }
}

async function notifyUsers(userIds: string[], title: string, message: string) {
  const cleanIds = Array.from(new Set(userIds.filter(Boolean)));
  if (!cleanIds.length) return;
  await prisma.notification.createMany({
    data: cleanIds.map((userId) => ({
      userId,
      type: "ACCOUNT",
      title,
      message,
      link: "/profile",
    })),
  });
}

export async function GET(req: NextRequest) {
  try {
    const actor = await requireAdminOrManagerOrSuperAdmin();
    if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "stats";
    const search = (searchParams.get("search") || "").trim();
    const isSuperAdmin = actor.role === "SUPER_ADMIN";

    if (type === "stats") {
      const [
        totalUsers, activeUsers, adminUsers, superAdminUsers, verifiedUsers,
        totalTrips, activeTrips, totalBookings, pendingBookings, confirmedBookings, cancelledBookings,
        totalExpenses, txCount,
        totalDestinations, activeDestinations, unreadNotifications, pendingReports, userLogCount,
        recentUsers, recentTrips, recentBookings, recentActivity,
        bookingsByStatus, tripsByStatus,
      ] = await Promise.all([
        prisma.user.count({ where: { role: "USER" } }),
        prisma.user.count({ where: { isActive: true, role: "USER" } }),
        prisma.user.count({ where: { role: "MANAGER" } }),
        prisma.user.count({ where: { role: "SUPER_ADMIN" } }),
        prisma.user.count({ where: { emailVerified: { not: null } } }),
        prisma.trip.count(),
        prisma.trip.count({ where: { status: "ACTIVE" } }),
        prisma.booking.count(),
        prisma.booking.count({ where: { status: "PENDING" } }),
        prisma.booking.count({ where: { status: "CONFIRMED" } }),
        prisma.booking.count({ where: { status: "CANCELLED" } }),
        prisma.expense.aggregate({ _sum: { amount: true } }),
        prisma.auditLog.count(),
        prisma.destinationCatalog.count(),
        prisma.destinationCatalog.count({ where: { isActive: true } }),
        prisma.notification.count({ where: { isRead: false } }),
        prisma.contentReport.count({ where: { status: "PENDING" } }),
        prisma.auditLog.count(),
        prisma.user.findMany({
          where: { role: "USER" },
          orderBy: { createdAt: "desc" }, take: 6,
          select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true, isActive: true, emailVerified: true },
        }),
        prisma.trip.findMany({ orderBy: { createdAt: "desc" }, take: 6, select: { id: true, title: true, status: true, totalBudget: true, createdAt: true, user: { select: { name: true, email: true } } } }),
        prisma.booking.findMany({ orderBy: { createdAt: "desc" }, take: 6, select: { id: true, provider: true, type: true, status: true, amount: true, createdAt: true, user: { select: { name: true, email: true } }, trip: { select: { title: true } } } }),
        prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, select: { id: true, action: true, details: true, createdAt: true, user: { select: { name: true, email: true } }, trip: { select: { title: true } } } }),
        prisma.booking.groupBy({ by: ["status"], _count: true }),
        prisma.trip.groupBy({ by: ["status"], _count: true }),
      ]);

      const onlineCutoff = Date.now() - 45 * 1000;
      const recentUsersWithPresence = recentUsers.map((u) => ({
        ...u,
        isOnline: u.isActive && new Date(u.updatedAt).getTime() >= onlineCutoff,
        presenceLabel: !u.isActive ? "Disabled" : (new Date(u.updatedAt).getTime() >= onlineCutoff ? "Active" : "Inactive"),
      }));

      return NextResponse.json({
        stats: {
          totalUsers, activeUsers, suspendedUsers: totalUsers - activeUsers, adminUsers, superAdminUsers, verifiedUsers,
          totalTrips, activeTrips, totalBookings, pendingBookings, confirmedBookings, cancelledBookings,
          totalExpenseAmount: totalExpenses._sum.amount || 0,
          totalBudget: totalExpenses._sum.amount || 0,
          txCount,
          totalDestinations, activeDestinations, unreadNotifications, pendingReports, userLogCount,
        },
        recentUsers: recentUsersWithPresence, recentTrips, recentBookings, recentActivity,
        bookingsByStatus: normCount(bookingsByStatus),
        tripsByStatus: normCount(tripsByStatus),
      });
    }

    if (type === "users") {
      // MANAGER can only see USERs, SUPER_ADMIN sees all
      const where: any = search
        ? { OR: [{ name: contains(search) }, { email: contains(search) }] }
        : {};
      if (!isSuperAdmin) {
        where.role = "USER";
      }
      const users = await prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true, name: true, email: true, role: true, isActive: true,
          emailVerified: true, twoFactorEnabled: true, createdAt: true, updatedAt: true,
          _count: { select: { trips: true, bookings: true, expenses: true } },
        },
      });
      const onlineCutoff = Date.now() - 45 * 1000;
      return NextResponse.json(users.map((u) => ({
        ...u,
        isOnline: u.isActive && new Date(u.updatedAt).getTime() >= onlineCutoff,
        presenceLabel: !u.isActive ? "Disabled" : (new Date(u.updatedAt).getTime() >= onlineCutoff ? "Active" : "Inactive"),
      })));
    }


    if (type === "admins") {
      const roles = isSuperAdmin ? ["MANAGER"] : ["SUPER_ADMIN"];
      const admins = await prisma.user.findMany({
        where: { role: { in: roles }, isActive: true },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, email: true, role: true, isActive: true },
      });
      return NextResponse.json(admins);
    }

    if (type === "user-detail") {
      const id = searchParams.get("id");
      if (!id) return NextResponse.json({ error: "User id is required" }, { status: 400 });
      const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
      // MANAGER cannot view SUPER_ADMIN or MANAGER details
      if (!isSuperAdmin && target?.role !== "USER") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true, name: true, email: true, role: true, isActive: true, emailVerified: true,
          twoFactorEnabled: true, image: true, createdAt: true, updatedAt: true,
          preference: true,
          trips: { orderBy: { createdAt: "desc" }, take: 8, select: { id: true, title: true, status: true, totalBudget: true, travelStyle: true, createdAt: true } },
          bookings: { orderBy: { createdAt: "desc" }, take: 8, select: { id: true, provider: true, type: true, status: true, amount: true, createdAt: true } },
          auditLogs: { orderBy: { createdAt: "desc" }, take: 8, select: { id: true, action: true, details: true, createdAt: true } },
          _count: { select: { trips: true, bookings: true, expenses: true } },
        },
      });
      if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
      return NextResponse.json(user);
    }

    if (type === "activity") {
      if (isSuperAdmin) {
        // Super Admin sees user audit logs + admin action logs + manager action logs — all separate
        const [userLogs, adminLogs, managerLogs, notifications] = await Promise.all([
          prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100, select: { id: true, action: true, details: true, createdAt: true, user: { select: { name: true, email: true } }, trip: { select: { title: true } } } }),
          prisma.adminActionLog.findMany({ orderBy: { createdAt: "desc" }, take: 100, select: { id: true, action: true, targetType: true, targetId: true, details: true, actorRole: true, createdAt: true, admin: { select: { name: true, email: true } } } }),
          prisma.managerActionLog.findMany({ orderBy: { createdAt: "desc" }, take: 100, select: { id: true, action: true, targetType: true, targetId: true, details: true, createdAt: true, manager: { select: { name: true, email: true } } } }),
          prisma.notification.findMany({ orderBy: { createdAt: "desc" }, take: 50, select: { id: true, title: true, type: true, isRead: true, createdAt: true, user: { select: { name: true, email: true } } } }),
        ]);
        return NextResponse.json({ activity: userLogs, adminLogs, managerLogs, notifications });
      } else {
        // MANAGER sees: user audit logs + own manager action logs
        const [userLogs, myActions, notifications] = await Promise.all([
          prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100, select: { id: true, action: true, details: true, createdAt: true, user: { select: { name: true, email: true } }, trip: { select: { title: true } } } }),
          prisma.managerActionLog.findMany({ where: { managerId: actor.id }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, action: true, targetType: true, targetId: true, details: true, createdAt: true } }),
          prisma.notification.findMany({ orderBy: { createdAt: "desc" }, take: 30, select: { id: true, title: true, type: true, isRead: true, createdAt: true, user: { select: { name: true, email: true } } } }),
        ]);
        return NextResponse.json({ activity: userLogs, myActions, notifications });
      }
    }

    if (type === "trips") {
      const where: any = search
        ? { OR: [{ title: contains(search) }, { user: { OR: [{ name: contains(search) }, { email: contains(search) }] } }] }
        : {};
      return NextResponse.json(
        await prisma.trip.findMany({ where, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, title: true, status: true, totalBudget: true, travelStyle: true, travelerCount: true, startDate: true, endDate: true, createdAt: true, user: { select: { name: true, email: true } }, _count: { select: { bookings: true, expenses: true, collaborators: true } } } })
      );
    }

    if (type === "bookings") {
      const where: any = search ? { OR: [{ provider: contains(search) }, { user: { OR: [{ name: contains(search) }, { email: contains(search) }] } }] } : {};
      return NextResponse.json(
        await prisma.booking.findMany({ where, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, provider: true, type: true, status: true, amount: true, checkIn: true, checkOut: true, createdAt: true, user: { select: { name: true, email: true } }, trip: { select: { title: true } } } })
      );
    }

    if (type === "destinations") {
      return NextResponse.json(
        await prisma.destinationCatalog.findMany({ orderBy: { rating: "desc" }, select: { id: true, name: true, city: true, country: true, description: true, category: true, latitude: true, longitude: true, rating: true, priceLevel: true, imageUrl: true, tags: true, openingHours: true, estimatedDuration: true, estimatedCost: true, currency: true, isFeatured: true, isActive: true, createdAt: true, updatedAt: true, _count: { select: { reviews: true, favoritedBy: true } } } })
      );
    }


    if (type === "analytics") {
      const [tripsByStatus, bookingsByStatus, topDestinationsRaw] = await Promise.all([
        prisma.trip.groupBy({ by: ["status"], _count: true }),
        prisma.booking.groupBy({ by: ["status"], _count: true }),
        prisma.destinationCatalog.findMany({
          orderBy: [{ rating: "desc" }, { updatedAt: "desc" }],
          take: 8,
          select: { id: true, name: true, rating: true, _count: { select: { reviews: true, favoritedBy: true } } },
        }),
      ]);
      const topDestinations = topDestinationsRaw.map((d: any) => ({
        name: d.name,
        rating: d.rating,
        _count: (d._count?.reviews || 0) + (d._count?.favoritedBy || 0),
      }));
      return NextResponse.json({
        tripsByStatus: normCount(tripsByStatus),
        bookingsByStatus: normCount(bookingsByStatus),
        topDestinations,
      });
    }

    if (type === "styles") {
      const STYLES = ["BUDGET", "BACKPACKER", "MODERATE", "FAMILY", "ADVENTURE", "CULTURAL", "RELAXATION", "LUXURY"];
      const results = await Promise.all(
        STYLES.map(async (style) => {
          const [users, trips, destinations] = await Promise.all([
            prisma.user.count({ where: { preference: { travelStyle: style } } }),
            prisma.trip.findMany({ where: { travelStyle: style }, select: { totalBudget: true } }),
            prisma.destinationCatalog.findMany({ where: { tags: { contains: style.toLowerCase() } }, select: { id: true, name: true, estimatedCost: true, rating: true }, take: 10 }),
          ]);
          return { style, users, trips: trips.length, totalBudget: trips.reduce((s: number, t: { totalBudget?: number | null }) => s + (t.totalBudget || 0), 0), destinations };
        })
      );
      return NextResponse.json(results);
    }

    if (type === "global") {
      const q = search;
      if (!q || q.length < 2) return NextResponse.json({});
      const userWhere: any = isSuperAdmin
        ? { OR: [{ name: contains(q) }, { email: contains(q) }] }
        : { AND: [{ role: "USER" }, { OR: [{ name: contains(q) }, { email: contains(q) }] }] };
      const [users, trips, destinations, bookings] = await Promise.all([
        prisma.user.findMany({ where: userWhere, take: 8, select: { id: true, name: true, email: true, role: true, isActive: true } }),
        prisma.trip.findMany({ where: { OR: [{ title: contains(q) }, { user: { OR: [{ name: contains(q) }, { email: contains(q) }] } }] }, take: 8, select: { id: true, title: true, status: true, user: { select: { email: true } } } }),
        prisma.destinationCatalog.findMany({ where: { OR: [{ name: contains(q) }, { city: contains(q) }, { country: contains(q) }] }, take: 8, select: { id: true, name: true, city: true, country: true } }),
        prisma.booking.findMany({ where: { OR: [{ provider: contains(q) }, { user: { OR: [{ name: contains(q) }, { email: contains(q) }] } }] }, take: 8, select: { id: true, provider: true, type: true, status: true, user: { select: { email: true } }, trip: { select: { title: true } } } }),
      ]);
      return NextResponse.json({ users, trips, destinations, bookings });
    }

    if (type === "messages") {
      // Get messages/notifications between admin roles
      const myNotifs = await prisma.notification.findMany({
        where: { userId: actor.id, type: "ADMIN_MESSAGE" },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, title: true, message: true, isRead: true, createdAt: true, metadata: true },
      });
      return NextResponse.json(myNotifs);
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  } catch (error) {
    console.error("Admin GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireAdminOrManagerOrSuperAdmin();
    if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const isSuperAdmin = actor.role === "SUPER_ADMIN";

    const body = await req.json();
    const { mode } = body;

    if (mode === "notification") {
      const { target, userIds, title, message, link } = body;
      if (!title?.trim() || !message?.trim()) return NextResponse.json({ error: "Title and message required" }, { status: 400 });

      // Build user list: MANAGER can only notify USERs
      let targets: { id: string }[];
      if (target === "selected" && Array.isArray(userIds) && userIds.length) {
        targets = await prisma.user.findMany({
          where: {
            id: { in: userIds },
            ...(isSuperAdmin ? {} : { role: "USER" }),
          },
          select: { id: true },
        });
      } else {
        targets = await prisma.user.findMany({
          where: isSuperAdmin ? { isActive: true } : { isActive: true, role: "USER" },
          select: { id: true },
        });
      }

      await prisma.notification.createMany({
        data: targets.map((u) => ({
          userId: u.id,
          type: "SYSTEM",
          title: title.trim(),
          message: message.trim(),
          link: link?.trim() || "/notifications",
        })),
      });

      await logAction(actor, "SEND_NOTIFICATION", "Notification", undefined, `${title} -> ${targets.length} user(s)`);
      return NextResponse.json({ count: targets.length });
    }

    if (mode === "message") {
      // Direct message between MANAGER and SUPER_ADMIN
      const { toUserId, title, message } = body;
      if (!toUserId || !title?.trim() || !message?.trim()) {
        return NextResponse.json({ error: "toUserId, title and message required" }, { status: 400 });
      }
      // Verify recipient is MANAGER or SUPER_ADMIN
      const recipient = await prisma.user.findUnique({ where: { id: toUserId }, select: { role: true } });
      if (!recipient || (recipient.role !== "MANAGER" && recipient.role !== "SUPER_ADMIN")) {
        return NextResponse.json({ error: "Can only message admin users" }, { status: 400 });
      }
      await prisma.notification.create({
        data: {
          userId: toUserId,
          type: "ADMIN_MESSAGE",
          title: title.trim(),
          message: message.trim(),
          link: "/admin/activity",
          metadata: JSON.stringify({ fromId: actor.id, fromRole: actor.role }),
        },
      });
      await logAction(actor, "SEND_ADMIN_MESSAGE", "User", toUserId, title);
      return NextResponse.json({ ok: true });
    }

    if (mode === "destination") {
      const { id, name, city, country, description, category, latitude, longitude, rating, priceLevel, estimatedCost, currency, imageUrl, tags, openingHours, estimatedDuration, isFeatured, isActive } = body;
      if (!name || !city || !country) return NextResponse.json({ error: "name, city, country required" }, { status: 400 });
      const tagsJson = JSON.stringify(
        typeof tags === "string"
          ? tags.split(",").map((t: string) => t.trim()).filter(Boolean)
          : Array.isArray(tags) ? tags : []
      );
      let destination: any;
      if (id) {
        destination = await prisma.destinationCatalog.update({
          where: { id },
          data: { name, city, country, description, category, latitude: Number(latitude) || 0, longitude: Number(longitude) || 0, rating: Number(rating) || 4.0, priceLevel: Number(priceLevel) || 2, estimatedCost: Number(estimatedCost) || 0, currency: currency || "USD", imageUrl, tags: tagsJson, openingHours, estimatedDuration, isFeatured: !!isFeatured, isActive: isActive !== false },
        });
      } else {
        destination = await prisma.destinationCatalog.create({
          data: { name, city, country, description, category, latitude: Number(latitude) || 0, longitude: Number(longitude) || 0, rating: Number(rating) || 4.0, priceLevel: Number(priceLevel) || 2, estimatedCost: Number(estimatedCost) || 0, currency: currency || "USD", imageUrl, tags: tagsJson, openingHours, estimatedDuration, isFeatured: !!isFeatured, isActive: isActive !== false },
        });
      }
      await logAction(actor, id ? "UPDATE_DESTINATION" : "CREATE_DESTINATION", "Destination", destination.id, destination.name);
      return NextResponse.json(destination);
    }

    // Admin send message to users (allowed for both)
    if (mode === "seed" || mode === "reset" || mode === "backup" || mode === "restore") {
      if (!isSuperAdmin) return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 });
    }

    return NextResponse.json({ error: "Unsupported admin action" }, { status: 400 });
  } catch (error) {
    console.error("Admin POST error:", error);
    return NextResponse.json({ error: "Admin action failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const actor = await requireAdminOrManagerOrSuperAdmin();
    if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const isSuperAdmin = actor.role === "SUPER_ADMIN";

    const body = await req.json();
    const { userId, userIds, action, tripId, status, destinationId, isActive } = body;

    // Destination toggle — both can do
    if (destinationId && isActive !== undefined) {
      const dest = await prisma.destinationCatalog.findUnique({ where: { id: destinationId } });
      if (!dest) return NextResponse.json({ error: "Destination not found" }, { status: 404 });
      await prisma.destinationCatalog.update({ where: { id: destinationId }, data: { isActive: !!isActive } });
      await logAction(actor, isActive ? "ENABLE_DESTINATION" : "DISABLE_DESTINATION", "Destination", destinationId);
      return NextResponse.json({ ok: true });
    }

    // Bulk user actions
    if (Array.isArray(userIds) && userIds.length && action) {
      // MANAGER can only act on USERs
      const safeIds = isSuperAdmin
        ? userIds
        : (await prisma.user.findMany({ where: { id: { in: userIds }, role: "USER" }, select: { id: true } })).map((u: { id: string }) => u.id);

      if (!safeIds.length) return NextResponse.json({ error: "No valid users to act on" }, { status: 400 });
      if (action === "BULK_DISABLE") {
        await prisma.user.updateMany({ where: { id: { in: safeIds } }, data: { isActive: false } });
        await notifyUsers(safeIds, "Account disabled", "Your SmartTravel account has been disabled by an administrator. Contact support if you think this is a mistake.");
      } else if (action === "BULK_ENABLE") {
        await prisma.user.updateMany({ where: { id: { in: safeIds } }, data: { isActive: true } });
        await notifyUsers(safeIds, "Account reactivated", "Your SmartTravel account has been reactivated. You can sign in again.");
      } else if (action === "BULK_MAKE_USER") {
        if (!isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        await prisma.user.updateMany({ where: { id: { in: safeIds } }, data: { role: "USER" } });
      } else {
        return NextResponse.json({ error: "Unsupported bulk action" }, { status: 400 });
      }
      await logAction(actor, action, "User", undefined, `${safeIds.length} user(s) updated`);
      return NextResponse.json({ ok: true, count: safeIds.length });
    }

    // Single user action
    if (userId && action) {
      const target = await prisma.user.findUnique({ where: { id: userId } });
      if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

      // MANAGER cannot act on SUPER_ADMIN or another MANAGER.
      // SUPER_ADMIN cannot disable or demote itself.
      if (!isSuperAdmin && target.role !== "USER") {
        return NextResponse.json({ error: "Managers can only manage regular user accounts." }, { status: 403 });
      }
      if (target.role === "SUPER_ADMIN" && actor.id !== target.id && !isSuperAdmin) {
        return NextResponse.json({ error: "Super admin accounts cannot be modified." }, { status: 403 });
      }
      if (actor.id === target.id && ["suspend", "TOGGLE_ACTIVE", "delete", "MAKE_USER", "MAKE_MANAGER"].includes(action)) {
        return NextResponse.json({ error: "You cannot disable or demote your own account." }, { status: 403 });
      }

      if (action === "suspend" || action === "TOGGLE_ACTIVE") {
        const nextActive = !target.isActive;
        await prisma.user.update({ where: { id: userId }, data: { isActive: nextActive } });
        await notifyUsers([userId], nextActive ? "Account reactivated" : "Account disabled", nextActive ? "Your SmartTravel account has been reactivated. You can sign in again." : "Your SmartTravel account has been disabled by an administrator. Contact support if you think this is a mistake.");
        await logAction(actor, "TOGGLE_USER_ACTIVE", "User", userId);
      } else if (action === "activate") {
        await prisma.user.update({ where: { id: userId }, data: { isActive: true } });
        await notifyUsers([userId], "Account reactivated", "Your SmartTravel account has been reactivated. You can sign in again.");
        await logAction(actor, "ACTIVATE_USER", "User", userId);
      } else if (action === "MAKE_MANAGER") {
        if (!isSuperAdmin) return NextResponse.json({ error: "Forbidden: Only Super Admin can promote to Manager" }, { status: 403 });
        await prisma.user.update({ where: { id: userId }, data: { role: "MANAGER" } });
        await logAction(actor, "MAKE_MANAGER", "User", userId);
      } else if (action === "MAKE_USER") {
        if (!isSuperAdmin) return NextResponse.json({ error: "Forbidden: Only Super Admin can demote roles" }, { status: 403 });
        await prisma.user.update({ where: { id: userId }, data: { role: "USER" } });
        await logAction(actor, "MAKE_USER", "User", userId);
      } else if (action === "MAKE_SUPER_ADMIN") {
        if (!isSuperAdmin) return NextResponse.json({ error: "Forbidden: Only Super Admin can assign Super Admin" }, { status: 403 });
        await prisma.user.update({ where: { id: userId }, data: { role: "SUPER_ADMIN" } });
        await logAction(actor, "MAKE_SUPER_ADMIN", "User", userId);
      } else if (action === "delete") {
        await prisma.user.update({ where: { id: userId }, data: { isActive: false } });
        await notifyUsers([userId], "Account disabled", "Your SmartTravel account has been disabled by an administrator. Contact support if you think this is a mistake.");
        await logAction(actor, "DISABLE_USER", "User", userId, "Safe local-demo delete: user disabled, data preserved.");
      } else {
        return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
      }
      return NextResponse.json({ ok: true });
    }

    // Trip status update
    if (tripId && status) {
      const trip = await prisma.trip.findUnique({ where: { id: tripId } });
      if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
      await prisma.trip.update({ where: { id: tripId }, data: { status } });
      await logAction(actor, "UPDATE_TRIP_STATUS", "Trip", tripId, status);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "No valid patch action" }, { status: 400 });
  } catch (error) {
    console.error("Admin PATCH error:", error);
    return NextResponse.json({ error: "Admin patch action failed" }, { status: 500 });
  }
}
