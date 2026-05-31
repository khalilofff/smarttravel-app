import type { ReactNode } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { AuthGate } from "@/components/common/auth-gate";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate adminOnly>
      <DashboardLayout>{children}</DashboardLayout>
    </AuthGate>
  );
}
