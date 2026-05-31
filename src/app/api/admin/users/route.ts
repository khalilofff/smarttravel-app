import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getLocalServerSession } from "@/lib/local-auth";

async function requireAdmin() {
  const session = await getLocalServerSession();
  if (!session?.user) return { error: "Unauthorized", status: 401 };
  if (session.user.role !== "MANAGER" && session.user.role !== "SUPER_ADMIN") {
    return { error: "Forbidden", status: 403 };
  }
  return { session, isSuperAdmin: session.user.role === "SUPER_ADMIN" };
}

function canManageActorTarget(actorRole: string, targetRole: string) {
  if (actorRole === "SUPER_ADMIN") return true;
  if (actorRole === "MANAGER" && targetRole === "USER") return true;
  return false;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const page = Number(searchParams.get("page") || 1);
    const limit = 20;

    const where: any = q
      ? { OR: [{ name: { contains: q } }, { email: { contains: q } }] }
      : {};
    if (!auth.isSuperAdmin) where.role = "USER";

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, name: true, email: true, role: true,
          isActive: true, createdAt: true, image: true,
          _count: { select: { trips: true, bookings: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({ users, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json();
    const { userId, action } = body;

    if (!userId || !action) return NextResponse.json({ error: "userId and action required" }, { status: 400 });

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const actorRole = auth.session.user.role;
    if (target.id === auth.session.user.id && action === "TOGGLE_ACTIVE") {
      return NextResponse.json({ error: "You cannot disable your own account." }, { status: 403 });
    }
    if (!canManageActorTarget(actorRole, target.role)) {
      const message = target.role === "SUPER_ADMIN"
        ? "Super admin accounts cannot be modified."
        : "Managers can only manage user accounts.";
      return NextResponse.json({ error: message }, { status: 403 });
    }

    let updateData: any = {};

    switch (action) {
      case "TOGGLE_ACTIVE":
        updateData = { isActive: !target.isActive };
        break;
      case "MAKE_MANAGER":
        if (!auth.isSuperAdmin) return NextResponse.json({ error: "Only Super Admin can create managers." }, { status: 403 });
        updateData = { role: "MANAGER" };
        break;
      case "MAKE_USER":
        if (!auth.isSuperAdmin && target.role !== "USER") return NextResponse.json({ error: "Managers can only manage user accounts." }, { status: 403 });
        updateData = { role: "USER" };
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    // Log action in the correct separated admin log table.
    if (auth.session.user.role === "SUPER_ADMIN") {
      await prisma.adminActionLog.create({
        data: { adminId: auth.session.user.id, action, targetType: "USER", targetId: userId, details: JSON.stringify(updateData), actorRole: "SUPER_ADMIN" },
      });
    } else {
      await prisma.managerActionLog.create({
        data: { managerId: auth.session.user.id, action, targetType: "USER", targetId: userId, details: JSON.stringify(updateData) },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Admin PATCH user error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
