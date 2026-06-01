"use client";

import Link from "next/link";
import {
  ArrowRight,
  CloudSun,
  CreditCard,
  Database,
  Globe2,
  Hotel,
  LockKeyhole,
  MapPin,
  Plane,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const liveFeatures = [
  { title: "Flights", text: "Search real flight providers, compare usable routes and keep selected flight data in the trip dashboard.", icon: Plane },
  { title: "Hotels", text: "Show hotel options for the chosen destination and dates, then let the user pick the best stay.", icon: Hotel },
  { title: "Places", text: "Suggest attractions, restaurants and activities for the exact city instead of showing generic examples.", icon: MapPin },
  { title: "Weather", text: "Use weather context to make the itinerary more realistic for the selected travel dates.", icon: CloudSun },
];

const workflow = [
  { step: "01", title: "Create account", text: "The user signs up, then keeps trips, bookings and selections in the local project database." },
  { step: "02", title: "Choose trip details", text: "Departure, destination, dates, traveler count, cabin, budget and travel style are selected." },
  { step: "03", title: "AI builds the plan", text: "SmartTravel compares live flights, hotels, places, events, currency and weather data." },
  { step: "04", title: "Review and export", text: "The user can choose options, open provider pages and export the trip plan for presentation." },
];

const stats = [
  { value: "01", label: "choose route and dates" },
  { value: "02", label: "compare flights and hotels" },
  { value: "03", label: "save, review and export" },
];

const securityCards = [
  { title: "Verification-ready auth", text: "Email verification is paused for demo, but the verification code path is kept for later activation.", icon: ShieldCheck },
  { title: "Safe provider redirects", text: "SmartTravel does not sell tickets. Booking buttons redirect users to real provider or search pages.", icon: LockKeyhole },
  { title: "Persistent project data", text: "Accounts, trips and user selections are stored locally and are not reset by a normal deploy.", icon: Database },
];

export default function LandingPage() {
  return (
    <main className="landing-page min-h-screen overflow-x-hidden bg-[#05070d] text-white">
      <div className="pointer-events-none fixed inset-0 -z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(59,130,246,0.24),transparent_34rem),radial-gradient(circle_at_86%_14%,rgba(14,165,233,0.16),transparent_36rem),linear-gradient(180deg,rgba(255,255,255,0.05),transparent_18%,rgba(0,0,0,0.32))]" />
        <div className="absolute -left-32 bottom-[-18rem] h-[42rem] w-[42rem] rounded-full border border-white/10 bg-white/[0.03] blur-[1px]" />
        <div className="absolute right-[-12rem] top-[-10rem] h-[36rem] w-[36rem] rounded-full border border-white/10 bg-white/[0.04] blur-[1px]" />
      </div>

      <header className="landing-header relative z-10 mx-auto flex w-full max-w-[1440px] items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-10">
        <Link href="/" className="landing-brand flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-2xl shadow-blue-500/10 backdrop-blur">
            <Plane className="h-5 w-5 text-sky-300" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-bold tracking-tight">SmartTravel</p>
            <p className="landing-brand-subtitle text-[11px] uppercase tracking-[0.24em] text-slate-400">AI Travel OS</p>
          </div>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
          <a href="#live" className="hover:text-white">Live APIs</a>
          <a href="#workflow" className="hover:text-white">How it works</a>
          <a href="#security" className="hover:text-white">Security</a>
        </nav>
        <div className="landing-actions flex shrink-0 items-center gap-2 sm:gap-3">
          <Link href="/login" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-300 hover:text-white sm:px-4">Sign in</Link>
          <Link href="/register" className="rounded-2xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950 shadow-2xl shadow-white/10 transition hover:bg-slate-200 sm:px-5">Get started</Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid w-full max-w-[1440px] items-center gap-12 px-5 pb-20 pt-10 sm:px-8 lg:grid-cols-[1.08fr_0.92fr] lg:px-10 lg:pb-28 lg:pt-20">
        <div className="min-w-0">
          <div className="mb-6 inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-slate-300 backdrop-blur">
            <Sparkles className="h-4 w-4 shrink-0 text-sky-300" />
            <span className="min-w-0 break-words">Live travel planning with safe sandbox actions</span>
          </div>
          <h1 className="max-w-5xl text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl md:text-6xl lg:text-7xl">
            Plan a complete trip before you book anything.
          </h1>
          <p className="mt-7 max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">
            SmartTravel helps a user choose departure and destination airports, travel dates, cabin class, traveler count and budget, then creates one clear dashboard with flight options, hotel options, places to visit, weather, events and budget guidance.
          </p>
          <div className="mt-8 grid max-w-4xl gap-3 sm:grid-cols-3">
            {stats.map((item) => (
              <div key={item.label} className="rounded-3xl border border-white/10 bg-white/[0.045] p-4">
                <p className="text-3xl font-black text-white">{item.value}</p>
                <p className="mt-1 text-sm text-slate-300">{item.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-9 flex flex-col gap-4 sm:flex-row">
            <Link href="/register" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-500 px-7 py-4 text-base font-bold text-white shadow-2xl shadow-blue-500/25 transition hover:bg-blue-400">
              Create account <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-7 py-4 text-base font-semibold text-white backdrop-blur transition hover:bg-white/[0.1]">
              Open dashboard
            </Link>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl">
          <div className="absolute -inset-10 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="relative rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:p-5">
            <div className="rounded-[1.5rem] border border-white/10 bg-[#070b14]/90 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
                <div className="min-w-0">
                  <p className="text-sm text-slate-400">AI trip plan</p>
                  <h2 className="break-words text-2xl font-black">Baku → Milan</h2>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-200">live APIs</span>
              </div>
              <div className="mt-5 grid gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-slate-400">Recommended flight</span>
                    <Plane className="h-4 w-4 shrink-0 text-sky-300" />
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

      <section id="workflow" className="relative z-10 mx-auto w-full max-w-[1440px] px-5 pb-16 sm:px-8 lg:px-10">
        <div className="grid gap-4 lg:grid-cols-4">
          {workflow.map((item) => (
            <div key={item.step} className="rounded-3xl border border-white/10 bg-white/[0.045] p-6 shadow-xl shadow-black/20">
              <p className="text-sm font-black text-sky-300">{item.step}</p>
              <h3 className="mt-4 text-xl font-bold">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="live" className="relative z-10 border-y border-white/10 bg-white/[0.03] py-16">
        <div className="mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-10">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-sky-300">Live API layer</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Generated data comes from connected providers.</h2>
            <p className="mt-4 text-base leading-7 text-slate-400">The system separates real provider calls, local database records and safe demo behavior so the visitor understands the project before signing in.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

      <section id="security" className="relative z-10 mx-auto grid w-full max-w-[1440px] gap-6 px-5 py-16 sm:px-8 md:grid-cols-3 lg:px-10">
        {securityCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <Icon className="mb-4 h-7 w-7 text-emerald-300" />
              <h3 className="text-xl font-bold">{card.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">{card.text}</p>
            </div>
          );
        })}
      </section>
    </main>
  );
}
