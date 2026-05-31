import type { ReactNode } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { AuthGate } from "@/components/common/auth-gate";

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <DashboardLayout>{children}</DashboardLayout>
    </AuthGate>
  );
}
