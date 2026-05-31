import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { getLocalServerSession } from "@/lib/local-auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getLocalServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;

    const { password } = await req.json();
    if (!password) return NextResponse.json({ error: "Password is required to confirm deletion" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return NextResponse.json({ error: "Incorrect password" }, { status: 403 });
    await prisma.auditLog.create({
      data: {
        userId,
        action: "USER_ACCOUNT_DELETED",
        details: "Soft delete requested by user. SmartTravel stores trip planning data only; no balance is used.",
      },
    }).catch(() => null);

    // Soft delete — deactivate account and anonymize PII
    // This preserves referential integrity (trips, expenses, bookings, etc.) while removing personal data
    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        email: `deleted_${userId}@deleted.invalid`,
        name: "Deleted User",
        passwordHash: null,
        image: null,
        emailVerified: null,
      },
    });

    // Invalidate all tokens
    await prisma.passwordResetToken.updateMany({
      where: { userId },
      data: { used: true },
    });
    await prisma.emailVerificationToken.updateMany({
      where: { userId },
      data: { used: true },
    });

    return NextResponse.json({ message: "Account deactivated successfully" });
  } catch (error) {
    console.error("Delete account error:", error);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
