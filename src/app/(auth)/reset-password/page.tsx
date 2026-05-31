"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, Input, Label, Card, CardContent } from "@/components/ui";
import { Lock } from "lucide-react";
import toast from "react-hot-toast";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (!token) { setError("Invalid reset link"); return; }
    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    if (res.ok) { toast.success("Password reset! Please sign in."); router.push("/login"); }
    else { setError(data.error || "Could not reset password. Check the local reset code/link and password rules."); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-indigo-50/50 to-background dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4"><Lock className="h-7 w-7 text-primary" /></div>
          <h1 className="text-2xl font-bold font-display">Reset Password</h1>
          <p className="text-sm text-muted-foreground mt-1">Enter your new password</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
              <div><Label>New Password</Label><Input type="password" placeholder="Min 8 characters" value={password} onChange={e => setPassword(e.target.value)} className="mt-1.5" required /></div>
              <div><Label>Confirm Password</Label><Input type="password" placeholder="••••••••" value={confirm} onChange={e => setConfirm(e.target.value)} className="mt-1.5" required /></div>
              <Button type="submit" className="w-full" size="lg" loading={loading}>Reset Password</Button>
            </form>
          </CardContent>
        </Card>
        <p className="text-center mt-4"><Link href="/login" className="text-sm text-primary hover:underline">Back to Sign In</Link></p>
      </div>
    </div>
  );
}
