import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { generateTwoFactorCode, validateTwoFactorCode } from "@/lib/services/two-factor-service";

const isSecureCookie = process.env.NEXTAUTH_URL?.startsWith("https://") ?? false;
const authCookiePrefix = process.env.NEXTAUTH_COOKIE_PREFIX || "smarttravel-local";
const baseCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: isSecureCookie,
};

export function buildAuthOptions(slot?: string): NextAuthOptions {
  const safeSlot = (slot || process.env.NEXTAUTH_COOKIE_PREFIX || "smarttravel-local")
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .slice(0, 80);
  const dynamicCookiePrefix = safeSlot.startsWith("smarttravel-") ? safeSlot : `smarttravel-${safeSlot}`;

  return {
  // CredentialsProvider + JWT sessions are used for this local demo.
  // No adapter is required, avoiding Auth.js/NextAuth adapter version mismatch.
  session: {
    strategy: "jwt",
    // Cookie upper bound. User-selected session duration is enforced in JWT/session callbacks.
    maxAge: 120 * 24 * 60 * 60,
  },
  pages: { signIn: "/login", error: "/login" },
  // Local demo multi-session support:
  // Run another app instance with a different NEXTAUTH_COOKIE_PREFIX so admin/user sessions do not overwrite each other.
  cookies: {
    sessionToken: {
      name: `${dynamicCookiePrefix}.next-auth.session-token`,
      options: baseCookieOptions,
    },
    csrfToken: {
      name: `${dynamicCookiePrefix}.next-auth.csrf-token`,
      options: baseCookieOptions,
    },
    callbackUrl: {
      name: `${dynamicCookiePrefix}.next-auth.callback-url`,
      options: { ...baseCookieOptions, httpOnly: false },
    },
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        twoFactorCode: { label: "2FA Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });
        if (!user || !user.passwordHash || !user.isActive) return null;
        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;
        const emailVerificationEnabled = process.env.EMAIL_VERIFICATION_ENABLED === "true";
        if (emailVerificationEnabled && !user.emailVerified) throw new Error("EMAIL_NOT_VERIFIED");

        if (user.twoFactorEnabled) {
          const code = credentials.twoFactorCode?.trim();
          if (!code) {
            await generateTwoFactorCode(user.id, "login");
            throw new Error("TWO_FACTOR_REQUIRED");
          }
          try {
            await validateTwoFactorCode(user.id, code);
          } catch {
            throw new Error("INVALID_TWO_FACTOR_CODE");
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? "",
          role: user.role,
          image: user.image ?? null,
          sessionDays: user.sessionDays ?? 30,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
        token.sessionDays = (user as { sessionDays?: number }).sessionDays || 30;
        token.loginAt = Date.now();
      }

      const selectedDays = typeof token.sessionDays === "number" ? token.sessionDays : 30;
      const loginAt = typeof token.loginAt === "number" ? token.loginAt : Date.now();
      token.sessionExpired = Date.now() > loginAt + selectedDays * 24 * 60 * 60 * 1000;

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      session.sessionDays = typeof token.sessionDays === "number" ? token.sessionDays : 30;
      session.sessionExpiresAt = typeof token.loginAt === "number"
        ? token.loginAt + (session.sessionDays || 30) * 24 * 60 * 60 * 1000
        : undefined;
      session.sessionExpired = !!token.sessionExpired;
      return session;
    },
  },
  };
}

export const authOptions: NextAuthOptions = buildAuthOptions(authCookiePrefix);
