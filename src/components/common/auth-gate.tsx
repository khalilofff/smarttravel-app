"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type AuthGateProps = {
  children?: ReactNode;
  adminOnly?: boolean;
};

export function AuthGate({ children, adminOnly = false }: AuthGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const role = session?.user?.role;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (status === "authenticated" && adminOnly && role !== "MANAGER" && role !== "SUPER_ADMIN") {
      router.replace("/dashboard");
      return;
    }
    if (status === "authenticated" && !adminOnly && (role === "MANAGER" || role === "SUPER_ADMIN") && pathname === "/dashboard") {
      router.replace("/admin/dashboard");
    }
  }, [status, adminOnly, role, router, pathname]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm rounded-2xl border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm font-medium">Restoring your local session...</p>
          <p className="mt-1 text-xs text-muted-foreground">This keeps mobile reloads and tab sessions stable.</p>
        </div>
      </div>
    );
  }

  if (!session?.user) return null;
  if (adminOnly && role !== "MANAGER" && role !== "SUPER_ADMIN") return null;

  return <>{children}</>;
}
