"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CloudSun,
  Globe2,
  Hotel,
  MapPin,
  Plane,
  ShieldCheck,
  Sparkles,
  CreditCard,
} from "lucide-react";

const liveFeatures = [
  { title: "Live flights", text: "SerpApi, SearchApi and Duffel sandbox provider flow with safe fallback.", icon: Plane },
  { title: "Live hotels", text: "Hotel suggestions are generated from connected hotel APIs for the selected city.", icon: Hotel },
  { title: "Live places", text: "Explore and itinerary places are generated from real place APIs instead of static mock cards.", icon: MapPin },
  { title: "Weather aware", text: "Plans use real weather guidance for the selected destination and trip dates.", icon: CloudSun },
];

const workflow = [
  "Create and verify your account by email",
  "Choose destination, dates, travelers and travel style",
  "Let AI compare live flights, hotels, places, weather and budget",
  "Review the recommended plan and edit any category manually",
];

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#05070d] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_25%,rgba(59,130,246,0.22),transparent_32%),radial-gradient(circle_at_82%_18%,rgba(14,165,233,0.16),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.05),transparent_18%,rgba(0,0,0,0.28))]" />
        <div className="absolute -left-32 bottom-[-18rem] h-[42rem] w-[42rem] rounded-full border border-white/10 bg-white/[0.03] blur-[1px]" />
        <div className="absolute right-[-12rem] top-[-10rem] h-[36rem] w-[36rem] rounded-full border border-white/10 bg-white/[0.04] blur-[1px]" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-7">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-2xl shadow-blue-500/10 backdrop-blur">
            <Plane className="h-5 w-5 text-sky-300" />
          </div>
          <div>
            <p className="text-base font-bold tracking-tight">SmartTravel</p>
            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-400">AI Travel OS</p>
          </div>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
          <a href="#live" className="hover:text-white">Live APIs</a>
          <a href="#workflow" className="hover:text-white">Workflow</a>
          <a href="#security" className="hover:text-white">Security</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white">Sign in</Link>
          <Link href="/register" className="rounded-2xl bg-white px-5 py-2.5 text-sm font-bold text-slate-950 shadow-2xl shadow-white/10 transition hover:bg-slate-200">Get started</Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-14 px-6 pb-24 pt-14 lg:grid-cols-[1.02fr_0.98fr] lg:pb-32 lg:pt-24">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-slate-300 backdrop-blur">
            <Sparkles className="h-4 w-4 text-sky-300" />
            Live travel planning with safe sandbox actions
          </div>
          <h1 className="max-w-4xl text-5xl font-black tracking-[-0.05em] text-white md:text-7xl lg:text-8xl">
            Plan real trips with live data, AI and one clean dashboard.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
            SmartTravel connects flight, hotel, places, weather, currency and event data, then helps the traveler build an editable itinerary and budget for presentation-ready planning.
          </p>
          <div className="mt-9 flex flex-col gap-4 sm:flex-row">
            <Link href="/register" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-500 px-7 py-4 text-base font-bold text-white shadow-2xl shadow-blue-500/25 transition hover:bg-blue-400">
              Create account <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-7 py-4 text-base font-semibold text-white backdrop-blur transition hover:bg-white/[0.1]">
              Open dashboard
            </Link>
          </div>
          <div className="mt-8 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
            {workflow.map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl">
          <div className="absolute -inset-10 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="relative rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/40 backdrop-blur-2xl">
            <div className="rounded-[1.5rem] border border-white/10 bg-[#070b14]/90 p-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-sm text-slate-400">AI trip plan</p>
                  <h2 className="text-2xl font-black">Baku → Milan</h2>
                </div>
                <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-200">live APIs</span>
              </div>
              <div className="mt-5 grid gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Recommended flight</span>
                    <Plane className="h-4 w-4 text-sky-300" />
                  </div>
                  <p className="mt-2 text-lg font-bold">Lowest usable route with return support</p>
                  <p className="mt-1 text-sm text-slate-400">AI compares price, stops, time and provider links.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <CreditCard className="mb-3 h-5 w-5 text-blue-300" />
                    <p className="text-sm text-slate-400">Budget split</p>
                    <p className="text-2xl font-black">AI planned</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <Globe2 className="mb-3 h-5 w-5 text-cyan-300" />
                    <p className="text-sm text-slate-400">Explore</p>
                    <p className="text-2xl font-black">Real places</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/20 to-cyan-400/10 p-4">
                  <p className="text-sm font-semibold text-sky-100">Presentation mode</p>
                  <p className="mt-1 text-sm text-slate-300">Real data is used where APIs return results; no fake travel cards are generated.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="live" className="relative z-10 border-y border-white/10 bg-white/[0.03] py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-sky-300">Live API layer</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight">Generated data comes from connected providers.</h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {liveFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="rounded-3xl border border-white/10 bg-[#080c15]/80 p-6 shadow-xl shadow-black/20">
                  <Icon className="mb-5 h-7 w-7 text-sky-300" />
                  <h3 className="text-lg font-bold">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{feature.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="workflow" className="relative z-10 mx-auto grid max-w-7xl gap-6 px-6 py-16 md:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <ShieldCheck className="mb-4 h-7 w-7 text-emerald-300" />
          <h3 className="text-xl font-bold">Verification-ready auth</h3>
          <p className="mt-3 text-sm leading-6 text-slate-400">Email verification is paused for the presentation build, but the Resend-based verification code is kept for later activation.</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <CreditCard className="mb-4 h-7 w-7 text-blue-300" />
          <h3 className="text-xl font-bold">Safe provider redirects</h3>
          <p className="mt-3 text-sm leading-6 text-slate-400">SmartTravel does not sell tickets or hotels. It opens real provider/Google booking option pages where the user can continue externally.</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <CalendarDays className="mb-4 h-7 w-7 text-cyan-300" />
          <h3 className="text-xl font-bold">Persistent project data</h3>
          <p className="mt-3 text-sm leading-6 text-slate-400">Accounts, trips and selections are stored in the database and are not reset by npm install.</p>
        </div>
      </section>
    </main>
  );
}
