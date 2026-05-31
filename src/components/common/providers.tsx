"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { LocalMultiSessionBootstrap } from "@/components/common/local-multi-session";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LocalMultiSessionBootstrap>
      <SessionProvider>{children}</SessionProvider>
    </LocalMultiSessionBootstrap>
  );
}
