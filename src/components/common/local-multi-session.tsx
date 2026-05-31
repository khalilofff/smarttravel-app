"use client";

import { useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "smarttravel.local.session.slot";
const MOBILE_LAST_SLOT_KEY = "smarttravel.local.mobile.lastSlot";
const MOBILE_DEVICE_SLOT_KEY = "smarttravel.local.mobile.deviceSlot";
const WINDOW_NAME_PREFIX = "smarttravel-tab-slot:";
const HEADER = "x-smarttravel-session-slot";

const THEME_EVENT = "smarttravel-tab-theme-change";

declare global {
  interface Window { __smartTravelFetchPatched?: boolean; }
}

function createSlot() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `tab-${crypto.randomUUID()}`;
  }
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readWindowNameSlot() {
  if (typeof window === "undefined") return null;
  return window.name?.startsWith(WINDOW_NAME_PREFIX)
    ? window.name.slice(WINDOW_NAME_PREFIX.length)
    : null;
}

function writeWindowNameSlot(slot: string) {
  if (typeof window === "undefined") return;
  // window.name survives normal reload/mobile restore better than sessionStorage,
  // but it is still scoped to this browser tab/window.
  window.name = `${WINDOW_NAME_PREFIX}${slot}`;
}

function isLikelyMobileBrowser() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export function getLocalSessionSlot() {
  const isMobile = isLikelyMobileBrowser();

  // Mobile Safari/Chrome can discard sessionStorage and window.name on pull-refresh,
  // memory pressure, or tab restore. Use one stable per-device local slot on mobile
  // so refreshing from the top keeps the same NextAuth cookie name and does not log out.
  if (isMobile) {
    let mobileSlot = localStorage.getItem(MOBILE_DEVICE_SLOT_KEY) || localStorage.getItem(MOBILE_LAST_SLOT_KEY);
    if (!mobileSlot) mobileSlot = createSlot();
    localStorage.setItem(MOBILE_DEVICE_SLOT_KEY, mobileSlot);
    localStorage.setItem(MOBILE_LAST_SLOT_KEY, mobileSlot);
    sessionStorage.setItem(STORAGE_KEY, mobileSlot);
    writeWindowNameSlot(mobileSlot);
    document.cookie = `smarttravel-active-slot=${encodeURIComponent(mobileSlot)}; path=/; SameSite=Lax; max-age=10368000`;
    return mobileSlot;
  }

  let slot = sessionStorage.getItem(STORAGE_KEY) || readWindowNameSlot();
  if (!slot) slot = createSlot();
  sessionStorage.setItem(STORAGE_KEY, slot);
  localStorage.setItem(MOBILE_LAST_SLOT_KEY, slot);
  writeWindowNameSlot(slot);
  document.cookie = `smarttravel-active-slot=${encodeURIComponent(slot)}; path=/; SameSite=Lax; max-age=10368000`;
  return slot;
}

export function getLocalThemeKey() {
  return `smarttravel.theme.${getLocalSessionSlot()}`;
}

export function getLocalTheme(): "light" | "dark" {
  const key = getLocalThemeKey();
  const saved = sessionStorage.getItem(key) || localStorage.getItem(key);
  return saved === "light" ? "light" : "dark";
}

export function setLocalTheme(theme: "light" | "dark") {
  const key = getLocalThemeKey();
  sessionStorage.setItem(key, theme);
  // Mobile reloads can clear sessionStorage, so persist only under the current slot key.
  // Other desktop tabs have different slot keys, so their themes still do not interrupt each other.
  localStorage.setItem(key, theme);
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset.theme = theme;
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: theme }));
}

export function useLocalTabTheme() {
  const [theme, setThemeState] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const initial = getLocalTheme();
    setLocalTheme(initial);
    setThemeState(initial);

    const onTheme = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      setThemeState(detail === "dark" ? "dark" : "light");
    };
    window.addEventListener(THEME_EVENT, onTheme);
    return () => window.removeEventListener(THEME_EVENT, onTheme);
  }, []);

  const setTheme = (next: "light" | "dark") => {
    setLocalTheme(next);
    setThemeState(next);
  };

  return { theme, setTheme };
}

export function LocalMultiSessionBootstrap({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const slot = getLocalSessionSlot();
    document.documentElement.dataset.localSessionSlot = slot;
    setLocalTheme(getLocalTheme());

    if (!window.__smartTravelFetchPatched) {
      const originalFetch = window.fetch.bind(window);
      window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
        const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
        headers.set(HEADER, getLocalSessionSlot());
        return originalFetch(input, { ...init, headers });
      };
      window.__smartTravelFetchPatched = true;
    }

    setReady(true);
  }, []);

  if (!ready) return null;
  return <>{children}</>;
}
