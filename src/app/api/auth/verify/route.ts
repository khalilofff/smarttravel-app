import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { sendVerificationEmail } from "@/lib/services/email-service";

async function verifyByToken(token: string) {
  const record = await prisma.emailVerificationToken.findUnique({ where: { token } });
  if (!record || record.used) return { ok: false, status: 400, error: "Invalid verification link" };
  if (record.expiresAt < new Date()) return { ok: false, status: 400, error: "Verification link expired. Please request a new link." };

  await prisma.$transaction([
    prisma.emailVerificationToken.update({ where: { id: record.id }, data: { used: true } }),
    prisma.user.update({ where: { id: record.userId }, data: { emailVerified: new Date() } }),
    prisma.notification.create({
      data: {
        userId: record.userId,
        type: "SYSTEM",
        title: "Email verified",
        message: "Your SmartTravel account is now verified.",
        link: "/dashboard",
      },
    }),
    prisma.auditLog.create({ data: { userId: record.userId, action: "EMAIL_VERIFIED", details: "Email link verification" } }),
  ]);

  return { ok: true };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = String(body.token || "").trim();
    if (!token) return NextResponse.json({ error: "Verification token is required" }, { status: 400 });

    const result = await verifyByToken(token);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status || 400 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Verify token error:", error);
    return NextResponse.json({ error: "Verification could not be completed." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") || "";
  if (!token) return NextResponse.redirect(new URL("/verify-email?error=missing_token", req.url));

  const result = await verifyByToken(token);
  if (!result.ok) {
    return NextResponse.redirect(new URL(`/verify-email?error=${encodeURIComponent(result.error || "invalid_token")}`, req.url));
  }

  return NextResponse.redirect(new URL("/verify-email?success=true", req.url));
}

export async function PUT(req: NextRequest) {
  try {
    const { email } = await req.json();
    const normalizedEmail = String(email || "").toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    if (user.emailVerified) return NextResponse.json({ error: "Account already verified" }, { status: 400 });

    const token = crypto.randomUUID();
    await prisma.emailVerificationToken.updateMany({ where: { userId: user.id, used: false }, data: { used: true } });
    await prisma.emailVerificationToken.create({
      data: { token, userId: user.id, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    });
    await sendVerificationEmail(user.email, token);
    return NextResponse.json({ message: "New verification email sent" });
  } catch (error) {
    console.error("Resend verification error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Verification email could not be sent. Check RESEND_API_KEY or SMTP settings in .env.local." }, { status: 500 });
  }
}
