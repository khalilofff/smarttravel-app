"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button, Input, Label } from "@/components/ui";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

const demoAccounts = [
  { icon: "👑", label: "Super Admin", email: "admin@smarttravel.com" },
  { icon: "🛡️", label: "Manager", email: "manager@smarttravel.com" },
  { icon: "👤", label: "User", email: "user@smarttravel.com" },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fillDemo = (mail: string) => {
    setEmail(mail);
    setPassword("Password123");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please fill in all fields."); return; }
    if (needsTwoFactor && !twoFactorCode) { setError("Please enter your 2FA code."); return; }
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email: email.toLowerCase().trim(),
        password,
        twoFactorCode: needsTwoFactor ? twoFactorCode : undefined,
        redirect: false,
      });
      if (res?.error || !res?.ok) {
        if (res?.error === "EMAIL_NOT_VERIFIED") {
          setError("Please verify your email before signing in.");
        } else if (res?.error === "TWO_FACTOR_REQUIRED") {
          setNeedsTwoFactor(true);
          setError("2FA is paused for the current presentation demo accounts.");
        } else if (res?.error === "INVALID_TWO_FACTOR_CODE") {
          setNeedsTwoFactor(true);
          setTwoFactorCode("");
          setError("Invalid or expired 2FA code.");
        } else {
          setError("Invalid email or password.");
        }
        setLoading(false);
        return;
      }
      toast.success("Welcome back!");
      const sessionRes = await fetch("/api/auth/session", { cache: "no-store" }).catch(() => null);
      const freshSession = sessionRes?.ok ? await sessionRes.json().catch(() => null) : null;
      const role = freshSession?.user?.role;
      const target = role === "MANAGER" || role === "SUPER_ADMIN" ? "/admin/dashboard" : "/dashboard";
      window.location.assign(target);
    } catch {
      setError("Something went wrong.");
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell min-h-screen overflow-hidden px-4 py-8 text-white">
      <div className="auth-bg" />
      <Link href="/" className="absolute left-5 top-5 z-10 text-sm text-slate-400 transition hover:text-white">‹ Home</Link>
      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-xl flex-col justify-center">
        <div className="mb-8 text-center">
          <Link href="/" className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.07] shadow-2xl shadow-blue-500/10 backdrop-blur-xl">
            <img src="/logo.png" alt="SmartTravel" className="h-12 w-12 rounded-2xl object-cover" />
          </Link>
          <h1 className="auth-title text-4xl font-black tracking-[-0.04em] md:text-5xl">Welcome back</h1>
          <p className="mt-3 text-base text-slate-400">Sign in to continue planning your trips.</p>
        </div>

        <div className="auth-card rounded-[2rem] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/50 backdrop-blur-2xl md:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-200">{error}</div>}
            <div>
              <Label htmlFor="email" className="text-sm font-bold text-slate-200">Email</Label>
              <Input id="email" type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} className="auth-input mt-2 h-14 rounded-2xl border-white/10 bg-black/25 text-base text-white placeholder:text-slate-500" />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-bold text-slate-200">Password</Label>
                <Link href="/forgot-password" className="text-sm font-semibold text-blue-300 hover:text-blue-200">Forgot password?</Link>
              </div>
              <div className="relative">
                <Input id="password" type={showPw ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="auth-input h-14 rounded-2xl border-white/10 bg-black/25 pr-12 text-base text-white placeholder:text-slate-500" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-white" aria-label="Toggle password visibility">
                  {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            {needsTwoFactor && (
              <div>
                <Label htmlFor="twoFactorCode" className="text-sm font-bold text-slate-200">Local 2FA Code</Label>
                <Input id="twoFactorCode" type="text" inputMode="numeric" maxLength={6} placeholder="6-digit code" value={twoFactorCode} onChange={e => setTwoFactorCode(e.target.value.replace(/\D/g, "").slice(0, 6))} className="auth-input mt-2 h-14 rounded-2xl border-white/10 bg-black/25 text-white" />
                <p className="mt-2 text-xs text-slate-500">2FA is paused for the current presentation demo accounts.</p>
              </div>
            )}
            <Button type="submit" className="h-14 w-full rounded-2xl bg-white text-base font-black text-slate-950 shadow-2xl shadow-white/10 transition hover:bg-blue-100" loading={loading}>
              {needsTwoFactor ? "Verify 2FA" : "Sign in"}
              {!needsTwoFactor && !loading && <ArrowRight className="ml-2 h-5 w-5" />}
            </Button>
          </form>

          <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-4">
            <p className="mb-3 text-sm font-bold text-white">Demo accounts <span className="text-slate-400">/ password: Password123</span></p>
            <div className="grid gap-2">
              {demoAccounts.map((account) => (
                <button key={account.email} type="button" onClick={() => fillDemo(account.email)} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-left text-sm transition hover:border-blue-400/40 hover:bg-blue-500/10">
                  <span className="font-semibold text-slate-200"><span className="mr-2">{account.icon}</span>{account.label}</span>
                  <span className="text-slate-400">{account.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-slate-400">
          Don&apos;t have an account? <Link href="/register" className="font-bold text-blue-300 hover:text-blue-200">Create one</Link>
        </p>
      </section>
    </main>
  );
}
