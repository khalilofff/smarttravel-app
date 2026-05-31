"use client";
import { useState } from "react";
import Link from "next/link";
import { Button, Input, Label, Card, CardContent } from "@/components/ui";
import { ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }),
    });
    setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-indigo-50/50 to-background dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Mail className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold font-display">Forgot Password</h1>
          <p className="text-sm text-muted-foreground mt-1">We&apos;ll send you a reset link</p>
        </div>
        <Card>
          <CardContent className="p-6">
            {sent ? (
              <div className="text-center py-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  If an account exists with that email, a reset link has been sent.
                </p>
                <div className="p-3 rounded-lg bg-muted text-left">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">🛠 Local Dev Note</p>
                  <p className="text-xs text-muted-foreground">
                    If SMTP is not configured, the reset link is printed to the <strong>server console</strong>.
                    Look for a line starting with <code className="bg-background px-1 rounded">🔗 RESET:</code>
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div><Label>Email</Label><Input type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} className="mt-1.5" required /></div>
                <Button type="submit" className="w-full" size="lg" loading={loading}>Send Reset Link</Button>
              </form>
            )}
          </CardContent>
        </Card>
        <p className="text-center mt-4"><Link href="/login" className="text-sm text-primary hover:underline inline-flex items-center gap-1"><ArrowLeft className="h-3 w-3" /> Back to Sign In</Link></p>
      </div>
    </div>
  );
}
