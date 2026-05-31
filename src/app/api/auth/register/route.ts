import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { registerSchema } from "@/lib/validators";
import { sendVerificationEmail } from "@/lib/services/email-service";

const emailVerificationEnabled = process.env.EMAIL_VERIFICATION_ENABLED === "true";

function appUrlFromRequest(req: NextRequest) {
  const configured = process.env.APP_URL?.trim();
  if (configured && configured !== "http://localhost:3000") return configured.replace(/\/$/, "");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || (host.startsWith("localhost") || host.startsWith("127.") || host.startsWith("192.168.") ? "http" : "https");
  return `${proto}://${host}`.replace(/\/$/, "");
}

function userFriendlyEmailError(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error);
  if (raw.toLowerCase().includes("api key")) return "Email service API key is invalid or missing. Check RESEND_API_KEY in .env.local.";
  if (raw.toLowerCase().includes("domain") || raw.toLowerCase().includes("verify")) return "Resend rejected the sender/domain. Use onboarding@resend.dev for testing, or verify your own domain in Resend.";
  if (raw.toLowerCase().includes("only send testing emails")) return "Resend test mode can only send to the email address verified in your Resend account. Use that email or verify a domain.";
  return `Verification email could not be sent: ${raw}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }

    const { name, email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const verificationToken = crypto.randomUUID();

    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,
        // Verification is intentionally paused for the presentation build.
        // When EMAIL_VERIFICATION_ENABLED=true, new users are created as pending until the email link is clicked.
        emailVerified: emailVerificationEnabled ? null : new Date(),
        preference: { create: {} },
        ...(emailVerificationEnabled
          ? {
              verificationTokens: {
                create: {
                  token: verificationToken,
                  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                },
              },
            }
          : {}),
      },
    });

    if (emailVerificationEnabled) {
      try {
        await sendVerificationEmail(user.email, verificationToken, appUrlFromRequest(req));
      } catch (mailError) {
        console.error("Verification email send error:", mailError instanceof Error ? mailError.message : mailError);
        await prisma.user.delete({ where: { id: user.id } }).catch(() => null);
        return NextResponse.json(
          {
            error: userFriendlyEmailError(mailError),
            email: normalizedEmail,
            emailSent: false,
          },
          { status: 502 }
        );
      }
    }

    return NextResponse.json(
      {
        message: emailVerificationEnabled
          ? "Account created. Check your email inbox and click the verification link."
          : "Account created. Email verification is paused for this presentation build.",
        email: normalizedEmail,
        verified: !emailVerificationEnabled,
        verificationPaused: !emailVerificationEnabled,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Registration could not be completed." }, { status: 500 });
  }
}
