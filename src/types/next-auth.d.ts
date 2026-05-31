import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    sessionDays?: number;
    sessionExpiresAt?: number;
    sessionExpired?: boolean;
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    role: string;
    sessionDays?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: string;
    sessionDays?: number;
    loginAt?: number;
    sessionExpired?: boolean;
  }
}
