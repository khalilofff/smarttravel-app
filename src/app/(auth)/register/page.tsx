"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Input, Label } from "@/components/ui";
import { Eye, EyeOff, CheckCircle2, ArrowRight } from "lucide-react";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.email || !form.password) { setError("All fields are required."); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (form.password !== form.confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed.");
        setLoading(false);
        return;
      }
      setDone(true);
    } catch {
      setError("Something went wrong.");
      setLoading(false);
    }
  };

  if (done) {
    return (
      <main className="auth-shell min-h-screen overflow-hidden px-4 py-8 text-white">
        <div className="auth-bg" />
        <section className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-xl flex-col justify-center text-center">
          <div className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-3xl border border-emerald-300/20 bg-emerald-400/10 shadow-2xl shadow-emerald-500/10 backdrop-blur-xl">
            <CheckCircle2 className="h-8 w-8 text-emerald-300" />
          </div>
          <h1 className="auth-title text-4xl font-black tracking-[-0.04em] md:text-5xl">Account created</h1>
          <p className="mx-auto mt-3 max-w-md text-base leading-7 text-slate-400">
            Your SmartTravel account is ready. Email verification is paused in this presentation build, so you can sign in now.
          </p>
          <div className="auth-card mx-auto mt-8 rounded-[2rem] border border-white/10 bg-white/[0.055] p-6 text-left shadow-2xl shadow-black/50 backdrop-blur-2xl">
            <p className="text-sm font-bold text-white">Developer note</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Verification code is still kept in the project and can be enabled later with <code className="rounded-lg bg-black/30 px-2 py-1 text-slate-200">EMAIL_VERIFICATION_ENABLED=true</code>.
            </p>
          </div>
          <Link href="/login" className="mx-auto mt-7 inline-flex h-14 items-center justify-center rounded-2xl bg-white px-8 text-base font-black text-slate-950 shadow-2xl shadow-white/10 transition hover:bg-blue-100">
            Go to login <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-shell min-h-screen overflow-hidden px-4 py-8 text-white">
      <div className="auth-bg" />
      <Link href="/" className="absolute left-5 top-5 z-10 text-sm text-slate-400 transition hover:text-white">‹ Home</Link>
      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-xl flex-col justify-center">
        <div className="mb-8 text-center">
          <Link href="/" className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.07] shadow-2xl shadow-blue-500/10 backdrop-blur-xl">
            <img src="/logo.png" alt="SmartTravel" className="h-12 w-12 rounded-2xl object-cover" />
          </Link>
          <h1 className="auth-title text-4xl font-black tracking-[-0.04em] md:text-5xl">Create account</h1>
          <p className="mt-3 text-base text-slate-400">Start your smart travel journey today.</p>
        </div>

        <div className="auth-card rounded-[2rem] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/50 backdrop-blur-2xl md:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-200">{error}</div>}
            <div>
              <Label className="text-sm font-bold text-slate-200">Full Name</Label>
              <Input placeholder="Hasan Khalilov" value={form.name} onChange={set("name")} className="auth-input mt-2 h-14 rounded-2xl border-white/10 bg-black/25 text-base text-white placeholder:text-slate-500" />
            </div>
            <div>
              <Label className="text-sm font-bold text-slate-200">Email</Label>
              <Input type="email" placeholder="you@email.com" value={form.email} onChange={set("email")} className="auth-input mt-2 h-14 rounded-2xl border-white/10 bg-black/25 text-base text-white placeholder:text-slate-500" />
            </div>
            <div>
              <Label className="text-sm font-bold text-slate-200">Password</Label>
              <div className="relative mt-2">
                <Input type={showPw ? "text" : "password"} placeholder="Min 8 characters" value={form.password} onChange={set("password")} className="auth-input h-14 rounded-2xl border-white/10 bg-black/25 pr-12 text-base text-white placeholder:text-slate-500" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-white" aria-label="Toggle password visibility">
                  {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <div>
              <Label className="text-sm font-bold text-slate-200">Confirm Password</Label>
              <Input type="password" placeholder="••••••••" value={form.confirmPassword} onChange={set("confirmPassword")} className="auth-input mt-2 h-14 rounded-2xl border-white/10 bg-black/25 text-base text-white placeholder:text-slate-500" />
            </div>
            <Button type="submit" className="h-14 w-full rounded-2xl bg-white text-base font-black text-slate-950 shadow-2xl shadow-white/10 transition hover:bg-blue-100" loading={loading}>
              Create account {!loading && <ArrowRight className="ml-2 h-5 w-5" />}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account? <Link href="/login" className="font-bold text-blue-300 hover:text-blue-200">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
