"use client";

import React, { useState, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Avatar, Badge } from "@/components/ui";
import {
  LayoutDashboard, Plane, Users, Bell,
  BookOpen, Settings, LogOut, ChevronLeft, ChevronRight, Search,
  Shield, Moon, Sun, Menu, Compass, Sparkles, Activity, Download,
  BarChart3, Flag, Database, ClipboardList, MapPinned,
  Crown, ShieldCheck, MessageSquare,
} from "lucide-react";
import { useLocalTabTheme } from "@/components/common/local-multi-session";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/trips", label: "My Trips", icon: Plane },
  { href: "/planner", label: "AI Planner", icon: Sparkles },
  { href: "/destinations", label: "Explore", icon: Compass },
  { href: "/budget", label: "Budget", icon: BarChart3 },
  { href: "/bookings", label: "Bookings", icon: BookOpen },
  { href: "/collaboration", label: "Collaboration", icon: Users },
  { href: "/export", label: "Export", icon: Download },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/profile", label: "Profile", icon: Settings },
  { href: "/settings", label: "Settings", icon: Settings },
];

// MANAGER is intentionally limited to user-level operations.
const adminOnlyItems = [
  { href: "/admin/dashboard", label: "Manager Overview", icon: Shield },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/trips", label: "Trips", icon: Plane },
  { href: "/admin/bookings", label: "Bookings", icon: ClipboardList },
  { href: "/admin/destinations", label: "Destinations", icon: MapPinned },
  { href: "/admin/moderation", label: "Moderation", icon: Flag },
  { href: "/admin/activity", label: "User Logs", icon: Activity },
  { href: "/admin/styles", label: "Travel Styles", icon: Sparkles },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
];

// SUPER_ADMIN keeps the full control center.
const superManagerItems = [
  { href: "/admin/dashboard", label: "Super Manager Overview", icon: Crown },
  { href: "/admin/users", label: "Users & Managers", icon: Users },
  { href: "/admin/trips", label: "Trips", icon: Plane },
  { href: "/admin/bookings", label: "Bookings", icon: ClipboardList },
  { href: "/admin/destinations", label: "Destinations", icon: MapPinned },
  { href: "/admin/moderation", label: "Moderation", icon: Flag },
  { href: "/admin/activity", label: "User & Manager Logs", icon: Activity },
  { href: "/admin/notifications", label: "Send Notifications", icon: Bell },
  { href: "/admin/styles", label: "Travel Styles", icon: Sparkles },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/system", label: "System Status", icon: Database },
];

function RoleBadge({ role }: { role: string }) {
  if (role === "SUPER_ADMIN") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
        <Crown className="h-3 w-3" /> Super Manager
      </span>
    );
  }
  if (role === "MANAGER") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
        <ShieldCheck className="h-3 w-3" /> Manager
      </span>
    );
  }
  return null;
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { theme, setTheme } = useLocalTabTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [freshProfile, setFreshProfile] = useState<{ name?: string | null; image?: string | null } | null>(null);
  const [headerCounts, setHeaderCounts] = useState({ notifications: 0, messages: 0 });

  const user = session?.user;
  const displayName = freshProfile?.name || user?.name || "User";
  const displayImage = freshProfile?.image ?? user?.image ?? null;
  const role = user?.role || "USER";
  const isSuperManager = role === "SUPER_ADMIN";
  const isManager = role === "MANAGER";
  const isAnyManager = isSuperManager || isManager;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!user?.id) return;
    let stopped = false;
    const pingPresence = async () => {
      if (stopped || document.visibilityState === "hidden") return;
      try {
        await fetch("/api/presence", { method: "POST", cache: "no-store" });
      } catch {
        // Presence is best-effort only.
      }
    };
    pingPresence();
    const interval = window.setInterval(pingPresence, 15000);
    window.addEventListener("focus", pingPresence);
    document.addEventListener("visibilitychange", pingPresence);
    const markOffline = () => {
      try { fetch("/api/presence", { method: "DELETE", keepalive: true }); } catch {}
    };
    window.addEventListener("pagehide", markOffline);
    return () => {
      stopped = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", pingPresence);
      document.removeEventListener("visibilitychange", pingPresence);
      window.removeEventListener("pagehide", markOffline);
    };
  }, [user?.id]);

  useEffect(() => {
    document.body.classList.toggle("mobile-menu-open", mobileOpen);
    return () => document.body.classList.remove("mobile-menu-open");
  }, [mobileOpen]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const loadHeaderData = async () => {
      try {
        const [profileRes, countsRes] = await Promise.all([
          fetch("/api/users/profile", { cache: "no-store" }),
          fetch("/api/header-counts", { cache: "no-store" }),
        ]);
        if (!cancelled && profileRes.ok) {
          const profile = await profileRes.json();
          setFreshProfile({ name: profile?.name || user?.name || "User", image: profile?.image || null });
        }
        if (!cancelled && countsRes.ok) {
          const counts = await countsRes.json();
          setHeaderCounts({ notifications: Number(counts?.notifications || 0), messages: Number(counts?.messages || 0) });
        }
      } catch {
        // Header profile/counts are convenience data only; the page should never crash because of them.
      }
    };
    loadHeaderData();
    const interval = window.setInterval(loadHeaderData, 20000);
    window.addEventListener("focus", loadHeaderData);
    return () => { cancelled = true; window.clearInterval(interval); window.removeEventListener("focus", loadHeaderData); };
  }, [user?.id, user?.name]);

  useEffect(() => {
    if (!isAnyManager || searchTerm.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin?type=global&search=${encodeURIComponent(searchTerm.trim())}`);
        if (res.ok) setSearchResults(await res.json());
        setSearchOpen(true);
      } catch {
        setSearchResults(null);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [searchTerm, isAnyManager]);

  // Build admin sidebar items based on role
  const adminItems = isSuperManager ? superManagerItems : adminOnlyItems;

  return (
    <div className="dashboard-shell flex h-[100dvh] w-full max-w-full overflow-hidden bg-background text-foreground" suppressHydrationWarning>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-[2px] lg:hidden" onClick={() => setMobileOpen(false)} />}

      <aside suppressHydrationWarning className={cn(
        "fixed lg:relative z-50 flex flex-col h-full bg-sidebar text-sidebar-foreground transition-all duration-150 border-r border-border shadow-xl backdrop-blur-xl",
        collapsed ? "lg:w-[72px] w-[82vw] max-w-xs" : "w-[82vw] max-w-xs lg:w-60",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className={cn("flex items-center h-16 px-4 border-b border-border", collapsed ? "justify-center" : "gap-3")}>
          <img src="/logo.png" alt="SmartTravel" className="w-9 h-9 rounded-xl object-cover shrink-0" />
          {!collapsed && <span className="font-black text-lg tracking-tight text-sidebar-foreground">SmartTravel</span>}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {isAnyManager ? (
            <>
              <div className={cn("pb-3", collapsed ? "px-1" : "px-3")}>
                {!collapsed ? (
                  <>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {isSuperManager ? "Super Manager Center" : "Manager Control Center"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {isSuperManager ? "Full platform control & oversight." : "Manage users, trips & destinations."}
                    </p>
                  </>
                ) : (
                  <div className="border-t border-border" />
                )}
              </div>
              {adminItems.map(item => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                    className={cn("flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-150",
                      active ? "bg-primary/15 text-primary active-glow border border-primary/25" : "border border-transparent text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/20")}>
                    <item.icon className="h-4.5 w-4.5 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}

              {/* Messaging shortcut */}
              {!collapsed && (
                <div className="pt-3 mt-3 border-t border-border">
                  <Link href="/admin/activity#messages" onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/15 transition-all duration-75">
                    <MessageSquare className="h-4.5 w-4.5 shrink-0" />
                    <span>Messages</span>
                  </Link>
                </div>
              )}
            </>
          ) : (
            navItems.map(item => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                  className={cn("flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-75",
                    active ? "bg-primary/15 text-primary active-glow border border-primary/25" : "border border-transparent text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/20")}>
                  <item.icon className="h-4.5 w-4.5 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })
          )}
        </nav>

        <div className="p-3 border-t border-border space-y-1">
          {/* Role badge shown above user */}
          {!collapsed && isAnyManager && (
            <div className="px-3 py-2">
              <RoleBadge role={role} />
            </div>
          )}
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-2xl text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/20 transition-all duration-150">
            {mounted ? (
              theme === "dark"
                ? <Sun className="h-4.5 w-4.5 shrink-0" />
                : <Moon className="h-4.5 w-4.5 shrink-0" />
            ) : (
              <span className="h-4.5 w-4.5 shrink-0" />
            )}
            {!collapsed && <span>{mounted ? (theme === "dark" ? "Light Mode" : "Dark Mode") : "Theme"}</span>}
          </button>
          <button onClick={async () => {
            try {
              await fetch("/api/presence", { method: "DELETE", keepalive: true });
              document.cookie = "smarttravel-active-slot=; Max-Age=0; path=/";
              sessionStorage.removeItem("smarttravel-tab-slot");
            } catch {}
            await signOut({ redirect: false, callbackUrl: `${window.location.origin}/login` });
            window.location.replace(`${window.location.origin}/login`);
          }}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-2xl text-sm text-sidebar-foreground/70 hover:text-red-600 hover:bg-red-500/10 transition-all duration-150">
            <LogOut className="h-4.5 w-4.5 shrink-0" />{!collapsed && <span>Sign Out</span>}
          </button>
          <button onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex items-center gap-3 w-full px-3 py-2 rounded-2xl text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/20 transition-all duration-150">
            {collapsed ? <ChevronRight className="h-4.5 w-4.5 shrink-0" /> : <ChevronLeft className="h-4.5 w-4.5 shrink-0" />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      <main className="dashboard-main flex-1 min-w-0 flex flex-col overflow-hidden">
        <header className="dashboard-header flex items-center min-h-16 w-full max-w-full px-2 sm:px-4 lg:px-6 border-b border-border bg-card/90 backdrop-blur-xl shrink-0 gap-2 sm:gap-4 overflow-hidden">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-muted"><Menu className="h-5 w-5" /></button>
          <div className="flex-1 min-w-0 flex items-center gap-4">
            <div className="relative hidden sm:block max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onFocus={() => setSearchOpen(true)}
                placeholder={isAnyManager ? "Search users, trips, bookings, destinations..." : "Search trips, destinations..."}
                className="w-full h-10 pl-9 pr-4 rounded-2xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/35" />
              {isAnyManager && searchOpen && searchTerm.trim().length >= 2 && searchResults && (
                <div className="absolute left-0 right-0 top-12 z-50 rounded-2xl border border-border bg-popover shadow-2xl shadow-black/10 p-3 max-h-96 overflow-y-auto backdrop-blur-xl">
                  {(["users", "trips", "destinations", "bookings", ] as const).map((group: any) => (
                    <div key={group} className="mb-3 last:mb-0">
                      <p className="px-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground">{group}</p>
                      {(searchResults[group] || []).length ? (searchResults[group] || []).map((item: any) => (
                        <Link key={item.id} href={`/admin/${group}`} onClick={() => { setSearchOpen(false); setSearchTerm(""); }}
                          className="block rounded-lg px-2 py-2 text-xs hover:bg-muted">
                          <span className="font-medium">{item.name || item.title || item.provider || item.method || item.email}</span>
                          <span className="ml-2 text-muted-foreground">{item.email || item.city || item.status || item.user?.email || item.trip?.title}</span>
                        </Link>
                      )) : <p className="px-2 py-1 text-xs text-muted-foreground">No matches</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <Link href={isAnyManager ? "/admin/activity#messages" : "/activity"} className="relative p-2 rounded-2xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" aria-label="Messages">
              <MessageSquare className="h-5 w-5" />
              {headerCounts.messages > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-black leading-none text-white shadow-lg shadow-red-500/30 ring-2 ring-background">
                  {headerCounts.messages > 9 ? "9+" : headerCounts.messages}
                </span>
              )}
            </Link>
            <Link href={isAnyManager ? "/admin/notifications" : "/notifications"} className="relative p-2 rounded-2xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              {headerCounts.notifications > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-black leading-none text-white shadow-lg shadow-red-500/30 ring-2 ring-background">
                  {headerCounts.notifications > 9 ? "9+" : headerCounts.notifications}
                </span>
              )}
            </Link>
            <Link href="/profile" className="flex items-center gap-2 min-w-0">
              <Avatar name={displayName} image={displayImage || undefined} size="sm" />
              <div className="hidden md:flex flex-col min-w-0">
                <span className="text-sm font-medium leading-tight truncate max-w-36">{displayName}</span>
                {isAnyManager && <RoleBadge role={role} />}
              </div>
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain bg-[radial-gradient(circle_at_80%_0%,rgba(128,171,171,0.16),transparent_34rem)] dashboard-scroll-area">
          <div className="dashboard-content mobile-page-pad p-3 sm:p-4 lg:p-6 max-w-7xl mx-auto w-full min-w-0">{children}</div>
        </div>

        <nav className="dashboard-mobile-bottom-nav fixed bottom-0 left-0 right-0 z-30 hidden grid-cols-4 border-t border-border bg-card/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 shadow-2xl backdrop-blur-xl lg:hidden">
          {[
            { href: isAnyManager ? "/admin/dashboard" : "/dashboard", label: "Home", icon: LayoutDashboard },
            { href: isAnyManager ? "/admin/trips" : "/planner", label: isAnyManager ? "Trips" : "Plan", icon: isAnyManager ? Plane : Sparkles },
            { href: isAnyManager ? "/admin/bookings" : "/trips", label: isAnyManager ? "Books" : "Trips", icon: BookOpen },
            { href: "/profile", label: "Profile", icon: Settings },
          ].map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={cn("flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-bold transition-colors", active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
