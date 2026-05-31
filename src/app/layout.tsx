import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Toaster } from "react-hot-toast";
import { Providers } from "@/components/common/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "SmartTravel — AI Travel Planning Platform",
  description: "Plan your dream trip with AI-powered itineraries, budget tracking, and collaboration tools.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen" suppressHydrationWarning>
        <Providers>
          {children}
          <Toaster position="top-right" toastOptions={{
            className: "!bg-card !text-card-foreground !border !border-border !shadow-lg",
            duration: 4000,
          }} />
        </Providers>
      </body>
    </html>
  );
}
