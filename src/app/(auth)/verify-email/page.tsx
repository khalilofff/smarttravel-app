"use client";

import Link from "next/link";
import { PauseCircle } from "lucide-react";
import { Card, CardContent, Button } from "@/components/ui";

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-indigo-50/50 to-background dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-background">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <PauseCircle className="h-14 w-14 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold font-display">Email verification paused</h1>
          <p className="text-sm text-muted-foreground mt-3">
            Verification is intentionally disabled in this presentation build so accounts can be created and tested locally without domain/email setup.
          </p>
          <div className="mt-5 rounded-xl border bg-muted/40 p-4 text-left text-xs text-muted-foreground">
            <p className="font-semibold mb-1">Developer note</p>
            <p>
              The verification API and email service are still kept in the project. Enable them later with <code className="bg-background px-1 rounded">EMAIL_VERIFICATION_ENABLED=true</code>, Resend key, verified sender/domain, and a public APP_URL.
            </p>
          </div>
          <Link href="/login"><Button className="w-full mt-6">Back to login</Button></Link>
        </CardContent>
      </Card>
    </div>
  );
}
