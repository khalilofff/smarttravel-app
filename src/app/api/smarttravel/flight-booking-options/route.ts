import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SERPAPI_KEY_1 = process.env.SERPAPI_KEY_1 || process.env.SERPAPI_KEY || process.env.FLIGHT_API_KEY || "";
const SERPAPI_KEY_2 = process.env.SERPAPI_KEY_2 || "49c1b263ead10feb4061ae7ddfed38383eb2a639d54b7662d155cde48f6272b6";
const SERPAPI_KEY_3 = process.env.SERPAPI_KEY_3 || "49a3c1cc4092afb292e552a22a7dacf04577f675efd0d786838243e4239fbcca";
const SERPAPI_KEYS: Record<string, string> = { SERPAPI_1: SERPAPI_KEY_1, SERPAPI_2: SERPAPI_KEY_2, SERPAPI_3: SERPAPI_KEY_3 };
const SERPAPI_KEY = SERPAPI_KEY_1;
const SEARCHAPI_FLIGHTS_KEY = process.env.SEARCHAPI_FLIGHTS_KEY || process.env.SEARCHAPI_KEY || "";

type BookingOption = {
  name?: string;
  price?: number;
  type?: string;
  link?: string;
  [key: string]: any;
};

function numberValue(value: any) {
  if (value === null || value === undefined || value === "") return undefined;
  const n = typeof value === "number" ? value : Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

function normalizeBookingLink(raw: any): string {
  const value = String(raw || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("/")) return `https://www.google.com${value}`;
  return value;
}

function isUsableBookingLink(link: string): boolean {
  if (!/^https?:\/\//i.test(link)) return false;
  try {
    const u = new URL(link);
    // Google /travel/clk/f links without signed query parameters often open as a 404.
    // Keep signed links, but reject bare click paths so the UI falls back to a safe Google Flights search page.
    if (u.hostname.includes("google.") && u.pathname === "/travel/clk/f" && !u.search) return false;
    return true;
  } catch {
    return false;
  }
}

function optionLink(o: BookingOption): string {
  return normalizeBookingLink(o?.link || o?.url || o?.booking_request?.url || o?.bookingRequest?.url || "");
}

function chooseBestBookingOption(options: BookingOption[]) {
  const usable = options.filter((o) => isUsableBookingLink(optionLink(o)) && !optionLink(o).startsWith("javascript:"));
  if (!usable.length) return null;

  const official = usable.find((o) => String(o.type || "").toLowerCase().includes("official"));
  if (official) return official;

  return [...usable].sort((a, b) => (numberValue(a.price) ?? 999999999) - (numberValue(b.price) ?? 999999999))[0];
}

function buildGoogleFlightsFallbackUrl({
  departureId,
  arrivalId,
  outboundDate,
  returnDate,
  currency,
}: {
  departureId: string;
  arrivalId: string;
  outboundDate: string;
  returnDate?: string;
  currency: string;
}) {
  const params = new URLSearchParams({
    engine: "google_flights",
    departure_id: departureId,
    arrival_id: arrivalId,
    outbound_date: outboundDate,
    currency: currency || "USD",
    hl: "en",
    gl: "us",
  });
  if (returnDate) params.set("return_date", returnDate);
  const q = `${departureId} to ${arrivalId} ${outboundDate}${returnDate ? ` return ${returnDate}` : ""}`;
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(q)}&curr=${encodeURIComponent(currency || "USD")}`;
}

function fallbackResponse(reason: string, fallbackUrl: string, diagnostics?: any) {
  return NextResponse.json({
    ok: true,
    fallback: true,
    provider: "Google Flights",
    providerType: "Fallback search page",
    price: null,
    link: fallbackUrl,
    method: "GET",
    selected: { name: "Google Flights", type: "Fallback search page", link: fallbackUrl },
    bookingOptions: [],
    selectionRule: reason,
    diagnostics,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const bookingToken = String(body.bookingToken || body.booking_token || "").trim();
    const departureToken = String(body.departureToken || body.departure_token || "").trim();
    const departureId = String(body.departureId || body.departure_id || "").trim().toUpperCase();
    const arrivalId = String(body.arrivalId || body.arrival_id || "").trim().toUpperCase();
    const outboundDate = String(body.outboundDate || body.outbound_date || "").trim();
    const returnDate = String(body.returnDate || body.return_date || "").trim();
    const currency = String(body.currency || "USD").trim().toUpperCase();
    const providerSource = String(body.providerSource || body.source || "").toLowerCase();
    const fallbackUrl = String(body.fallbackUrl || body.googleFlightsUrl || body.google_flights_url || "").trim()
      || (departureId && arrivalId && outboundDate
        ? buildGoogleFlightsFallbackUrl({ departureId, arrivalId, outboundDate, returnDate, currency })
        : "");
    const serpApiSlot = String(body.serpApiSlot || body.serpApiProvider || "SERPAPI_1").trim().toUpperCase();
    const activeSerpApiKey = SERPAPI_KEYS[serpApiSlot] || SERPAPI_KEY;

    if (providerSource.includes("searchapi")) {
      if (!SEARCHAPI_FLIGHTS_KEY) {
        return NextResponse.json({ error: "SEARCHAPI_FLIGHTS_KEY or SEARCHAPI_KEY is missing from .env.local" }, { status: 400 });
      }
      if (!departureId || !arrivalId || !outboundDate) {
        return NextResponse.json({ error: "departure_id, arrival_id and outbound_date are required for SearchApi booking options" }, { status: 400 });
      }
      const params = new URLSearchParams({
        engine: "google_flights",
        flight_type: returnDate ? "round_trip" : "one_way",
        departure_id: departureId,
        arrival_id: arrivalId,
        outbound_date: outboundDate,
        currency: "USD",
        hl: "en",
        gl: "us",
        api_key: SEARCHAPI_FLIGHTS_KEY,
      });
      if (returnDate) params.set("return_date", returnDate);
      if (bookingToken) params.set("booking_token", bookingToken);
      else if (departureToken) params.set("departure_token", departureToken);
      else if (fallbackUrl) return fallbackResponse("No SearchApi booking/departure token was returned; opening official Google Flights search page.", fallbackUrl);
      const url = `https://www.searchapi.io/api/v1/search?${params.toString()}`;
      const response = await fetch(url, { cache: "no-store" });
      const text = await response.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
      const apiError = data?.error || data?.message || data?.search_metadata?.error;
      if (!response.ok || apiError) {
        if (fallbackUrl) return fallbackResponse("SearchApi booking options failed; opening Google Flights fallback.", fallbackUrl, { status: response.status, error: apiError });
        return NextResponse.json({ error: apiError || `SearchApi booking options failed with HTTP ${response.status}` }, { status: 400 });
      }
      const bookingOptions: BookingOption[] = Array.isArray(data?.booking_options) ? data.booking_options : [];
      const selected = chooseBestBookingOption(bookingOptions);
      if (!selected) {
        const searchFallback = String(data?.search_metadata?.google_flights_url || data?.google_flights_url || "").trim() || fallbackUrl;
        if (searchFallback) return fallbackResponse("No direct provider booking link was returned by SearchApi; opening Google Flights fallback.", searchFallback, { keys: Object.keys(data || {}).slice(0, 30) });
        return NextResponse.json({ error: "No usable booking option link returned by SearchApi", bookingOptions }, { status: 404 });
      }
      const link = optionLink(selected);
      const method = selected.booking_request?.post_data ? "POST_REQUIRED" : "GET";
      if (method === "POST_REQUIRED" && fallbackUrl) {
        return fallbackResponse("SearchApi returned a POST-only booking request; opening safe Google Flights search page instead of a broken click URL.", fallbackUrl, { selectedProvider: selected.book_with || selected.name || selected.option_title });
      }
      return NextResponse.json({
        ok: true,
        provider: selected.book_with || selected.name || selected.option_title || "Booking provider",
        providerType: selected.fare_type || selected.type || "SearchApi booking option",
        price: selected.price ?? null,
        link,
        method,
        postData: selected.booking_request?.post_data || null,
        selected,
        bookingOptions,
        selectionRule: "Official/provider booking link selected from SearchApi Google Flights booking_options.",
      });
    }

    if (!activeSerpApiKey) {
      return NextResponse.json({ error: `${serpApiSlot || "SERPAPI_KEY"} is missing from .env.local` }, { status: 400 });
    }

    if (!departureId || !arrivalId || !outboundDate) {
      return NextResponse.json({
        error: "departure_id, arrival_id and outbound_date are required for SerpApi booking options",
        received: { departureId, arrivalId, outboundDate, returnDate, hasBookingToken: Boolean(bookingToken), hasDepartureToken: Boolean(departureToken) },
      }, { status: 400 });
    }

    if (!bookingToken && !departureToken) {
      if (fallbackUrl) {
        return fallbackResponse("No booking/departure token was returned for this flight; opening Google Flights fallback.", fallbackUrl);
      }
      return NextResponse.json({ error: "booking_token or departure_token is missing for this selected flight" }, { status: 400 });
    }

    const baseParams = new URLSearchParams({
      engine: "google_flights",
      departure_id: departureId,
      arrival_id: arrivalId,
      outbound_date: outboundDate,
      currency,
      hl: "en",
      api_key: activeSerpApiKey,
    });
    if (returnDate) baseParams.set("return_date", returnDate);

    let finalBookingToken = bookingToken;
    let nextFlightsDiagnostics: any = null;

    // SerpApi usually returns departure_token after the outbound selection.
    // For round trips, use it once to fetch return choices; those choices normally contain booking_token.
    if (!finalBookingToken && departureToken) {
      const nextParams = new URLSearchParams(baseParams);
      nextParams.set("departure_token", departureToken);
      const nextUrl = `https://serpapi.com/search.json?${nextParams.toString()}`;
      const nextResponse = await fetch(nextUrl, { cache: "no-store" });
      const nextText = await nextResponse.text();
      let nextData: any = null;
      try { nextData = nextText ? JSON.parse(nextText) : null; } catch { nextData = { raw: nextText }; }
      const nextError = nextData?.error || nextData?.search_metadata?.error || nextData?.message;
      const candidates = [
        ...(Array.isArray(nextData?.best_flights) ? nextData.best_flights : []),
        ...(Array.isArray(nextData?.other_flights) ? nextData.other_flights : []),
      ];
      const sorted = candidates
        .filter((item: any) => item?.booking_token || item?.bookingToken)
        .sort((a: any, b: any) => (numberValue(a.price) ?? 999999999) - (numberValue(b.price) ?? 999999999));
      finalBookingToken = String(sorted[0]?.booking_token || sorted[0]?.bookingToken || "").trim();
      nextFlightsDiagnostics = {
        ok: nextResponse.ok && !nextError,
        status: nextResponse.status,
        error: nextError,
        candidateCount: candidates.length,
        bookingTokenFound: Boolean(finalBookingToken),
        keys: Object.keys(nextData || {}).slice(0, 30),
      };
    }

    if (!finalBookingToken) {
      if (fallbackUrl) {
        return fallbackResponse(
          "SerpApi did not return a booking_token after the departure_token step; opening Google Flights fallback.",
          fallbackUrl,
          { nextFlights: nextFlightsDiagnostics }
        );
      }
      return NextResponse.json({
        error: "SerpApi did not return a booking_token for this flight. Try another flight option.",
        diagnostics: nextFlightsDiagnostics,
      }, { status: 404 });
    }

    const params = new URLSearchParams(baseParams);
    params.set("booking_token", finalBookingToken);

    const url = `https://serpapi.com/search.json?${params.toString()}`;
    const response = await fetch(url, { cache: "no-store" });
    const text = await response.text();
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }

    const apiError = data?.error || data?.search_metadata?.error || data?.message;
    if (!response.ok || apiError) {
      return NextResponse.json({
        error: apiError || `SerpApi booking options failed with HTTP ${response.status}`,
        status: response.status,
        diagnostics: {
          nextFlights: nextFlightsDiagnostics,
          keys: Object.keys(data || {}).slice(0, 30),
          rawPreview: typeof data?.raw === "string" ? data.raw.slice(0, 500) : undefined,
        },
      }, { status: 400 });
    }

    const bookingOptions: BookingOption[] = Array.isArray(data?.booking_options) ? data.booking_options : [];
    const selected = chooseBestBookingOption(bookingOptions);

    if (!selected) {
      const serpFallback = String(data?.search_metadata?.google_flights_url || data?.google_flights_url || "").trim() || fallbackUrl;
      if (serpFallback) {
        return fallbackResponse(
          "No official/agency booking option link was returned by SerpApi; opening Google Flights fallback.",
          serpFallback,
          { nextFlights: nextFlightsDiagnostics, keys: Object.keys(data || {}).slice(0, 30), bookingOptions }
        );
      }
      return NextResponse.json({
        error: "No usable booking option link returned by SerpApi",
        status: response.status,
        bookingOptions,
        diagnostics: { nextFlights: nextFlightsDiagnostics, keys: Object.keys(data || {}).slice(0, 30) },
      }, { status: 404 });
    }

    const link = optionLink(selected);
    const method = selected.booking_request?.post_data ? "POST_REQUIRED" : "GET";
    if (method === "POST_REQUIRED" && fallbackUrl) {
      return fallbackResponse("SerpApi returned a POST-only booking request; opening safe Google Flights search page instead of a broken click URL.", fallbackUrl, { selectedProvider: selected.name, nextFlights: nextFlightsDiagnostics });
    }

    return NextResponse.json({
      ok: true,
      provider: selected.name || "Booking provider",
      providerType: selected.type || "Unknown provider type",
      price: selected.price ?? null,
      link,
      method,
      postData: selected.booking_request?.post_data || null,
      selected,
      bookingOptions,
      selectionRule: String(selected.type || "").toLowerCase().includes("official")
        ? "Official website preferred"
        : "No official website returned; cheapest provider selected",
      diagnostics: { nextFlights: nextFlightsDiagnostics },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Booking options request failed" }, { status: 500 });
  }
}
