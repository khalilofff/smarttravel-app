import { NextRequest, NextResponse } from "next/server";

const SERPAPI_KEY_1 = process.env.SERPAPI_KEY_1 || process.env.SERPAPI_KEY || process.env.FLIGHT_API_KEY || "";
const SERPAPI_KEY_2 = process.env.SERPAPI_KEY_2 || "49c1b263ead10feb4061ae7ddfed38383eb2a639d54b7662d155cde48f6272b6";
const SERPAPI_KEY_3 = process.env.SERPAPI_KEY_3 || "49a3c1cc4092afb292e552a22a7dacf04577f675efd0d786838243e4239fbcca";
const SERPAPI_KEY = SERPAPI_KEY_1;
const SERPAPI_KEYS = [
  { slot: "SERPAPI_3", label: "SerpApi #3", key: SERPAPI_KEY_3 },
  { slot: "SERPAPI_2", label: "SerpApi #2", key: SERPAPI_KEY_2 },
  { slot: "SERPAPI_1", label: "SerpApi #1", key: SERPAPI_KEY_1 },
].filter((item) => Boolean(item.key));
const SEARCHAPI_KEY = process.env.SEARCHAPI_KEY || process.env.GOOGLE_HOTELS_API_KEY || "";
const SEARCHAPI_FLIGHTS_KEY = process.env.SEARCHAPI_FLIGHTS_KEY || process.env.SEARCHAPI_KEY || "";
const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY || "";
const EXCHANGE_RATE_API_KEY = process.env.EXCHANGE_RATE_API_KEY || "";
const EVENTBRITE_PRIVATE_TOKEN = process.env.EVENTBRITE_PRIVATE_TOKEN || "";
const DUFFEL_API_KEY = process.env.DUFFEL_API_KEY || "";

const SERPAPI_SUPPORTED_CURRENCIES = new Set(["USD", "EUR", "TRY", "GBP", "AED", "JPY"]);
const FALLBACK_USD_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  TRY: 32,
  AZN: 1.7,
  GBP: 0.79,
  AED: 3.67,
  JPY: 157,
};

let exchangeRateDiagnostics: any = { source: "static fallback", status: "fallback" };

async function refreshExchangeRates() {
  if (!EXCHANGE_RATE_API_KEY) {
    exchangeRateDiagnostics = { source: "static fallback", status: "api_key_missing", message: "EXCHANGE_RATE_API_KEY is missing; static rates are used." };
    return exchangeRateDiagnostics;
  }
  try {
    const url = `https://v6.exchangerate-api.com/v6/${EXCHANGE_RATE_API_KEY}/latest/USD`;
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.result === "error" || !data?.conversion_rates) {
      exchangeRateDiagnostics = { source: "ExchangeRate-API", status: "api_failed", error: data?.['error-type'] || data?.error || `HTTP ${res.status}` };
      return exchangeRateDiagnostics;
    }
    for (const [code, rate] of Object.entries(data.conversion_rates || {})) {
      const n = Number(rate);
      if (Number.isFinite(n) && n > 0) FALLBACK_USD_RATES[String(code).toUpperCase()] = n;
    }
    exchangeRateDiagnostics = { source: "ExchangeRate-API", status: "live", base: data.base_code || "USD", updated: data.time_last_update_utc || null, currencies: Object.keys(data.conversion_rates || {}).length };
    return exchangeRateDiagnostics;
  } catch (error: any) {
    exchangeRateDiagnostics = { source: "ExchangeRate-API", status: "api_failed", error: error?.message || "Exchange rate request failed; static fallback rates are used." };
    return exchangeRateDiagnostics;
  }
}

function normalizeCurrencyCode(value: any): string {
  return String(value || "USD").trim().toUpperCase();
}

function serpCurrencyFor(requestedCurrency: string): string {
  const requested = normalizeCurrencyCode(requestedCurrency);
  return SERPAPI_SUPPORTED_CURRENCIES.has(requested) ? requested : "USD";
}

function convertCurrency(amount: number | undefined, fromCurrency: string, toCurrency: string): number | undefined {
  if (amount === undefined || !Number.isFinite(amount)) return undefined;
  const from = normalizeCurrencyCode(fromCurrency);
  const to = normalizeCurrencyCode(toCurrency);
  if (from === to) return Math.round(amount);
  const fromRate = FALLBACK_USD_RATES[from] || 1;
  const toRate = FALLBACK_USD_RATES[to] || 1;
  const usd = amount / fromRate;
  return Math.round(usd * toRate);
}

type FlightLeg = {
  route: string;
  airline: string;
  flightNumber?: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops?: number;
};

type FlightOption = {
  id: string;
  source: string;
  route: string;
  originCode: string;
  destinationCode: string;
  departureId?: string;
  arrivalId?: string;
  outboundDate?: string;
  returnDate?: string;
  airline: string;
  flightNumber?: string;
  price?: number;
  currency: string;
  originalPrice?: number;
  originalCurrency?: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops?: number;
  bookingToken?: string;
  departureToken?: string;
  bookingUrl?: string;
  outbound?: FlightLeg;
  inbound?: FlightLeg | null;
  isRoundTrip?: boolean;
  aiScore?: number;
  aiReason?: string;
  totalDurationMinutes?: number;
  durationMinutes?: number;
  rawKeys?: string[];
  cabinClass?: string;
  serpApiSlot?: string;
  serpApiLabel?: string;
};

function textValue(...values: any[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function numberValue(...values: any[]): number | undefined {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const n = typeof value === "number" ? value : Number(String(value).replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function moneyValue(...values: any[]): number | undefined {
  for (const value of values) {
    if (value && typeof value === "object") {
      const nested = moneyValue(value.extracted_price, value.value, value.amount, value.raw, value.text, value.price);
      if (nested) return nested;
    }
    const n = numberValue(value);
    if (n !== undefined && n > 0) return Math.round(n);
  }
  return undefined;
}

function formatMinutes(minutes: any): string {
  const n = numberValue(minutes);
  if (!n) return "";
  const h = Math.floor(n / 60);
  const m = Math.round(n % 60);
  return h ? `${h}h ${m ? `${m}m` : ""}`.trim() : `${m}m`;
}

function isoDate(value: string): string {
  const raw = String(value || "").trim();
  const d = new Date(raw);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return raw;
}

function rankFlight(f: FlightOption): number {
  if (typeof f.aiScore === "number") return f.aiScore;
  const priceScore = f.price || 999999;
  const stopScore = (f.stops || 0) * 100;
  return priceScore + stopScore;
}

async function serpApiJson(url: string) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
    const apiError = data?.error || data?.search_metadata?.error || data?.message;
    return { ok: res.ok && !apiError, status: res.status, url, data, error: apiError || (res.ok ? undefined : `HTTP ${res.status}`) };
  } catch (error: any) {
    return { ok: false, status: 0, url, data: null, error: error?.message || "SerpApi request failed" };
  }
}

function airportCode(obj: any, fallback: string): string {
  return textValue(obj?.id, obj?.airport_id, obj?.code, fallback).toUpperCase();
}

function normalizeSerpApiFlight(item: any, index: number, fallback: any, returnItem?: any): FlightOption | null {
  const segments = Array.isArray(item?.flights) ? item.flights : [];
  const first = segments[0] || {};
  const last = segments[segments.length - 1] || first;
  const originCode = airportCode(first?.departure_airport, fallback.from);
  const destinationCode = airportCode(last?.arrival_airport, fallback.to);
  if (!originCode || !destinationCode) return null;

  const returnSegments = Array.isArray(returnItem?.flights) ? returnItem.flights : [];
  const returnFirst = returnSegments[0] || {};
  const returnLast = returnSegments[returnSegments.length - 1] || returnFirst;

  const airlines = Array.from(new Set(segments.map((seg: any) => textValue(seg?.airline)).filter(Boolean)));
  const flightNumbers = segments.map((seg: any) => textValue(seg?.flight_number)).filter(Boolean);
  const returnAirlines = Array.from(new Set(returnSegments.map((seg: any) => textValue(seg?.airline)).filter(Boolean)));
  const returnFlightNumbers = returnSegments.map((seg: any) => textValue(seg?.flight_number)).filter(Boolean);

  // SerpApi Google Flights returns `price` as the full displayed itinerary total for
  // the selected passenger count. Do NOT multiply it by travelers and do NOT add the
  // return-flight price again; the next-flight request is used only to get return
  // details/booking_token.
  const originalPrice = moneyValue(item?.price, item?.extracted_price, item?.total_price, item?.booking_options?.[0]?.price)
    || moneyValue(returnItem?.price, returnItem?.extracted_price, returnItem?.total_price, returnItem?.booking_options?.[0]?.price);
  const originalCurrency = normalizeCurrencyCode(fallback.serpCurrency || fallback.currency);
  const price = convertCurrency(originalPrice, originalCurrency, fallback.currency);

  const outboundDurationMinutes = numberValue(item?.total_duration, item?.duration);
  const inboundDurationMinutes = numberValue(returnItem?.total_duration, returnItem?.duration);
  const outboundDuration = formatMinutes(outboundDurationMinutes) || textValue(item?.duration);
  const inboundDuration = formatMinutes(inboundDurationMinutes) || textValue(returnItem?.duration);
  const stops = Math.max(0, segments.length - 1) + Math.max(0, returnSegments.length - 1);
  const bookingToken = textValue(returnItem?.booking_token, item?.booking_token);
  const departureToken = textValue(item?.departure_token, item?.token);
  const bookingUrl = textValue(item?.link, item?.booking_url, returnItem?.link, returnItem?.booking_url, fallback.googleFlightsUrl);

  const outbound: FlightLeg = {
    route: `${fallback.departure} (${originCode}) → ${fallback.destination} (${destinationCode})`,
    airline: airlines.join(", ") || "Airline not returned by Google Flights",
    flightNumber: flightNumbers.join(", ") || undefined,
    departureTime: textValue(first?.departure_airport?.time, fallback.departureDate),
    arrivalTime: textValue(last?.arrival_airport?.time, fallback.departureDate),
    duration: outboundDuration || "Duration not returned by Google Flights",
    stops: Math.max(0, segments.length - 1),
  };

  const inbound: FlightLeg | null = returnSegments.length ? {
    route: `${fallback.destination} (${airportCode(returnFirst?.departure_airport, fallback.to)}) → ${fallback.departure} (${airportCode(returnLast?.arrival_airport, fallback.from)})`,
    airline: returnAirlines.join(", ") || "Airline not returned by Google Flights",
    flightNumber: returnFlightNumbers.join(", ") || undefined,
    departureTime: textValue(returnFirst?.departure_airport?.time, fallback.returnDate),
    arrivalTime: textValue(returnLast?.arrival_airport?.time, fallback.returnDate),
    duration: inboundDuration || "Duration not returned by Google Flights",
    stops: Math.max(0, returnSegments.length - 1),
  } : null;

  const returnRequested = Boolean(fallback.returnDate);
  const totalDurationMinutes = (outboundDurationMinutes || 9999) + (inbound ? (inboundDurationMinutes || 9999) : 0);
  const aiScore = (price || 999999) + stops * 120 + totalDurationMinutes * 0.8 + (returnRequested && !inbound ? 5000 : 0);

  return {
    id: textValue(bookingToken, departureToken, item?.id, `serpapi-google-flights-${index}`),
    source: fallback.serpApiLabel || "SerpApi Google Flights",
    serpApiSlot: fallback.serpApiSlot,
    serpApiLabel: fallback.serpApiLabel,
    route: inbound ? `${outbound.route} + Return` : outbound.route,
    originCode,
    destinationCode,
    departureId: fallback.from,
    arrivalId: fallback.to,
    outboundDate: fallback.departureDate,
    returnDate: fallback.returnDate,
    airline: outbound.airline,
    flightNumber: outbound.flightNumber,
    price,
    currency: fallback.currency,
    originalPrice,
    originalCurrency,
    departureTime: outbound.departureTime,
    arrivalTime: inbound?.arrivalTime || outbound.arrivalTime,
    duration: inbound ? `${outbound.duration} + ${inbound.duration}` : outbound.duration,
    stops,
    bookingToken,
    departureToken,
    bookingUrl,
    outbound,
    inbound,
    isRoundTrip: Boolean(inbound),
    totalDurationMinutes,
    durationMinutes: outboundDurationMinutes,
    aiScore,
    aiReason: inbound
      ? "AI prefers this round-trip because it has usable outbound and return flight data, lower price, and fewer stops."
      : (returnRequested ? "Only outbound data was returned for this round-trip option; choose it only if no complete round-trip option is available." : "AI selected this one-way flight because it has usable outbound flight data, price and route details."),
    rawKeys: Object.keys(item || {}).slice(0, 20),
    cabinClass: fallback.cabinClass || "Economy",
  };
}

function extractSerpApiFlights(data: any) {
  const best = Array.isArray(data?.best_flights) ? data.best_flights : [];
  const other = Array.isArray(data?.other_flights) ? data.other_flights : [];
  return [...best, ...other];
}

function summarizeAttempt(attempt: any, key: string) {
  const data = attempt?.data || {};
  return {
    ok: attempt?.ok,
    status: attempt?.status,
    error: attempt?.error,
    url: attempt?.url ? attempt.url.replace(key, "SERPAPI_KEY") : "",
    keys: Object.keys(data || {}).slice(0, 20),
    searchStatus: data?.search_metadata?.status,
    bestFlightsCount: Array.isArray(data?.best_flights) ? data.best_flights.length : 0,
    otherFlightsCount: Array.isArray(data?.other_flights) ? data.other_flights.length : 0,
    rawPreview: typeof data?.raw === "string" ? data.raw.slice(0, 300) : undefined,
  };
}

async function getReturnFlightsForDeparture(baseParams: URLSearchParams, departureToken: string, key: string) {
  if (!departureToken || !baseParams.get("return_date")) return null;
  const params = new URLSearchParams(baseParams);
  params.set("departure_token", departureToken);
  const attempt = await serpApiJson(`https://serpapi.com/search.json?${params.toString()}`) as any;
  const flights = extractSerpApiFlights(attempt.data || {});
  return { attempt, flights };
}

function serpTravelClass(cabinClass: string) {
  const c = String(cabinClass || "ECONOMY").toUpperCase().replace(/[\s-]+/g, "_");
  if (c.includes("FIRST")) return "4";
  if (c.includes("BUSINESS")) return "3";
  if (c.includes("PREMIUM")) return "2";
  return "1";
}

function cabinLabel(cabinClass: string) {
  const c = String(cabinClass || "ECONOMY").toUpperCase().replace(/[\s-]+/g, "_");
  if (c.includes("FIRST")) return "First Class";
  if (c.includes("BUSINESS")) return "Business";
  if (c.includes("PREMIUM")) return "Premium Economy";
  return "Economy";
}

async function getSerpApiFlights(departure: string, destination: string, departureDate: string, returnDate: string, adults: number, currency: string, from: string, to: string, cabinClass: string = "ECONOMY", keyConfig: { slot: string; label: string; key: string } = { slot: "SERPAPI_1", label: "SerpApi #1", key: SERPAPI_KEY_1 }) {
  if (!from || !to) {
    return { source: "none", status: "airport_not_selected", diagnostics: { message: "Select real IATA airports before generating." }, flights: [] as FlightOption[] };
  }
  const activeSerpApiKey = keyConfig?.key || "";
  const activeSerpApiLabel = keyConfig?.label || "SerpApi";
  const activeSerpApiSlot = keyConfig?.slot || "SERPAPI";
  if (!activeSerpApiKey) {
    return { source: "none", status: "api_key_missing", diagnostics: { message: `${activeSerpApiSlot} is missing from .env.local`, activeSerpApiSlot, activeSerpApiLabel }, flights: [] as FlightOption[] };
  }

  const dep = isoDate(departureDate);
  const ret = isoDate(returnDate);
  const requestedCurrency = normalizeCurrencyCode(currency);
  const serpCurrency = serpCurrencyFor(requestedCurrency);
  const params = new URLSearchParams({
    engine: "google_flights",
    departure_id: from,
    arrival_id: to,
    outbound_date: dep,
    currency: serpCurrency,
    adults: String(Math.max(1, adults || 1)),
    hl: "en",
    api_key: activeSerpApiKey,
    travel_class: serpTravelClass(cabinClass),
  });
  if (ret) params.set("return_date", ret);

  const url = `https://serpapi.com/search.json?${params.toString()}`;
  const attempt = await serpApiJson(url) as any;
  const raw = extractSerpApiFlights(attempt.data || {});
  const fallback = { from, to, departure, destination, departureDate: dep, returnDate: ret, currency: requestedCurrency, serpCurrency, googleFlightsUrl: textValue(attempt.data?.search_metadata?.google_flights_url, attempt.data?.google_flights_url), cabinClass: cabinLabel(cabinClass), serpApiSlot: activeSerpApiSlot, serpApiLabel: activeSerpApiLabel };

  const returnAttempts: any[] = [];
  const normalized: FlightOption[] = [];
  for (let index = 0; index < Math.min(raw.length, 10); index++) {
    const item = raw[index];
    let returnItem: any = null;
    const depToken = textValue(item?.departure_token, item?.booking_token, item?.token);
    if (ret && depToken) {
      const returnResult = await getReturnFlightsForDeparture(params, depToken, activeSerpApiKey);
      if (returnResult) {
        returnAttempts.push(summarizeAttempt(returnResult.attempt, activeSerpApiKey));
        returnItem = returnResult.flights?.[0] || null;
      }
    }
    const option = normalizeSerpApiFlight(item, index, fallback, returnItem);
    if (option) normalized.push(option);
  }

  const unique = new Map<string, FlightOption>();
  normalized.forEach((flight) => {
    const key = [flight.airline, flight.outbound?.departureTime || flight.departureTime, flight.inbound?.departureTime || "", flight.price, flight.stops].join("|");
    const existing = unique.get(key);
    if (!existing || rankFlight(flight) < rankFlight(existing)) unique.set(key, flight);
  });
  const flights = Array.from(unique.values()).sort((a, b) => rankFlight(a) - rankFlight(b));

  if (flights.length > 0) {
    return {
      source: activeSerpApiLabel,
      status: "live",
      diagnostics: { attempt: summarizeAttempt(attempt, activeSerpApiKey), returnAttempts, count: flights.length, roundTripCount: flights.filter(f => f.isRoundTrip).length, activeSerpApiSlot, activeSerpApiLabel },
      flights: flights.slice(0, 20),
    };
  }

  return {
    source: activeSerpApiLabel,
    status: "api_failed",
    diagnostics: {
      attempt: summarizeAttempt(attempt, activeSerpApiKey),
      activeSerpApiSlot,
      activeSerpApiLabel,
      message: attempt.error || "SerpApi Google Flights returned no usable flight options for the selected route/date. No mock flight data generated.",
      requested: { from, to, departureDate: dep, returnDate: ret, adults: Math.max(1, adults || 1), currency: requestedCurrency, serpCurrency, cabinClass: cabinLabel(cabinClass), travelClass: serpTravelClass(cabinClass) },
    },
    flights: [] as FlightOption[],
  };
}


async function searchApiFlightsJson(params: Record<string, string | number | undefined>) {
  if (!SEARCHAPI_FLIGHTS_KEY) {
    return { ok: false, status: 0, url: "https://www.searchapi.io/api/v1/search", data: null, error: "SEARCHAPI_FLIGHTS_KEY or SEARCHAPI_KEY is missing from .env.local" };
  }
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") search.set(key, String(value));
  });
  search.set("engine", "google_flights");
  search.set("api_key", SEARCHAPI_FLIGHTS_KEY);
  const url = `https://www.searchapi.io/api/v1/search?${search.toString()}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
    const apiError = data?.error || data?.message || data?.search_metadata?.error;
    return { ok: res.ok && !apiError, status: res.status, url, data, error: apiError || (res.ok ? undefined : `HTTP ${res.status}`) };
  } catch (error: any) {
    return { ok: false, status: 0, url, data: null, error: error?.message || "SearchApi Google Flights request failed" };
  }
}

function summarizeSearchApiAttempt(attempt: any) {
  const url = String(attempt?.url || "");
  return {
    ok: Boolean(attempt?.ok),
    status: attempt?.status,
    error: attempt?.error,
    url: url ? url.replace(/api_key=[^&]+/g, "api_key=***") : "",
    keys: attempt?.data && typeof attempt.data === "object" ? Object.keys(attempt.data).slice(0, 20) : [],
  };
}

function cityAirportCandidates(code: string, cityName: string): string[] {
  const candidates: string[] = [];
  const push = (value: any) => {
    const v = String(value || "").trim().toUpperCase();
    if (/^[A-Z]{3}$/.test(v) && !candidates.includes(v)) candidates.push(v);
  };
  push(code);
  const key = String(cityName || "").toLowerCase();
  if (key.includes("baku") || key.includes("bakı")) push("GYD");
  if (key.includes("istanbul") || key.includes("i̇stanbul")) { push("IST"); push("SAW"); }
  if (key.includes("ankara")) push("ESB");
  if (key.includes("izmir")) push("ADB");
  if (key.includes("paris")) { push("CDG"); push("ORY"); }
  if (key.includes("london")) { push("LHR"); push("LGW"); push("STN"); }
  if (key.includes("new york")) { push("JFK"); push("EWR"); push("LGA"); }
  if (key.includes("madrid")) push("MAD");
  if (key.includes("dubai")) push("DXB");
  if (key.includes("rome")) push("FCO");
  if (key.includes("barcelona")) push("BCN");
  return candidates.length ? candidates : [String(code || "").trim().toUpperCase()].filter(Boolean);
}

function searchApiDataFlightCount(data: any): number {
  return (Array.isArray(data?.best_flights) ? data.best_flights.length : 0) + (Array.isArray(data?.other_flights) ? data.other_flights.length : 0);
}

function searchApiBuildParams(input: {
  from: string;
  to: string;
  dep: string;
  ret: string;
  adults: number;
  currency: string;
  cabinClass: string;
  includeTravelClass: boolean;
}): Record<string, string | number | undefined> {
  const params: Record<string, string | number | undefined> = {
    flight_type: input.ret ? "round_trip" : "one_way",
    departure_id: input.from,
    arrival_id: input.to,
    outbound_date: input.dep,
    return_date: input.ret || undefined,
    currency: input.currency,
    adults: Math.max(1, input.adults || 1),
    hl: "en",
    gl: "us",
  };
  // SearchApi follows Google Flights-style numeric travel_class values. Some routes
  // return empty when a class is unavailable, so we try once with class and once
  // without it below.
  if (input.includeTravelClass) params.travel_class = serpTravelClass(input.cabinClass);
  return params;
}

async function getSearchApiReturnFlightsForDeparture(baseParams: Record<string, string | number | undefined>, departureToken: string) {
  if (!departureToken || !baseParams.return_date) return null;
  const params = { ...baseParams, departure_token: departureToken };
  const attempt = await searchApiFlightsJson(params) as any;
  const flights = extractSerpApiFlights(attempt.data || {});
  return { attempt, flights };
}

async function getSearchApiGoogleFlights(departure: string, destination: string, departureDate: string, returnDate: string, adults: number, currency: string, from: string, to: string, cabinClass: string = "ECONOMY") {
  if (!from || !to) {
    return { source: "SearchApi Google Flights", status: "airport_not_selected", diagnostics: { message: "Select real IATA airports before using SearchApi Google Flights." }, flights: [] as FlightOption[] };
  }
  if (!SEARCHAPI_FLIGHTS_KEY) {
    return { source: "SearchApi Google Flights", status: "api_key_missing", diagnostics: { message: "SEARCHAPI_FLIGHTS_KEY or SEARCHAPI_KEY is missing from .env.local" }, flights: [] as FlightOption[] };
  }

  const dep = isoDate(departureDate);
  const ret = isoDate(returnDate);
  const requestedCurrency = normalizeCurrencyCode(currency);
  // SearchApi/Google Flights is most reliable with USD. We convert to the user's
  // currency after parsing. This avoids AZN/TRY edge cases returning empty results.
  const searchCurrency = "USD";
  const fromCandidates = cityAirportCandidates(from, departure).slice(0, 3);
  const toCandidates = cityAirportCandidates(to, destination).slice(0, 3);
  const attempts: any[] = [];
  let selectedAttempt: any = null;
  let selectedFrom = fromCandidates[0];
  let selectedTo = toCandidates[0];

  for (const origin of fromCandidates) {
    for (const dest of toCandidates) {
      if (!origin || !dest || origin === dest) continue;
      const variants = [
        searchApiBuildParams({ from: origin, to: dest, dep, ret, adults, currency: searchCurrency, cabinClass, includeTravelClass: true }),
        searchApiBuildParams({ from: origin, to: dest, dep, ret, adults, currency: searchCurrency, cabinClass, includeTravelClass: false }),
      ];
      for (const params of variants) {
        const attempt = await searchApiFlightsJson(params) as any;
        attempts.push({ origin, dest, params, attempt, count: searchApiDataFlightCount(attempt.data || {}) });
        if (attempt.ok && searchApiDataFlightCount(attempt.data || {}) > 0) {
          selectedAttempt = attempt;
          selectedFrom = origin;
          selectedTo = dest;
          break;
        }
      }
      if (selectedAttempt) break;
    }
    if (selectedAttempt) break;
  }

  const bestAttemptRecord = attempts.find(a => a.attempt?.ok && a.count > 0) || attempts.find(a => a.attempt?.ok) || attempts[0];
  const attempt = selectedAttempt || bestAttemptRecord?.attempt || { ok: false, status: 0, data: null, error: "SearchApi was not called" };
  const raw = extractSerpApiFlights(attempt.data || {});
  const fallback = {
    from: selectedFrom || from,
    to: selectedTo || to,
    departure,
    destination,
    departureDate: dep,
    returnDate: ret,
    currency: requestedCurrency,
    serpCurrency: searchCurrency,
    googleFlightsUrl: textValue(attempt.data?.search_metadata?.google_flights_url, attempt.data?.google_flights_url),
    cabinClass: cabinLabel(cabinClass),
  };

  const returnAttempts: any[] = [];
  const normalized: FlightOption[] = [];
  const baseParamsForReturn = searchApiBuildParams({ from: selectedFrom || from, to: selectedTo || to, dep, ret, adults, currency: searchCurrency, cabinClass, includeTravelClass: false });
  for (let index = 0; index < Math.min(raw.length, 30); index++) {
    const item = raw[index];
    let returnItem: any = null;
    const depToken = textValue(item?.departure_token, item?.booking_token, item?.token);
    if (ret && depToken) {
      const returnResult = await getSearchApiReturnFlightsForDeparture(baseParamsForReturn, depToken);
      if (returnResult) {
        returnAttempts.push(summarizeSearchApiAttempt(returnResult.attempt));
        returnItem = returnResult.flights?.[0] || null;
      }
    }
    const flight = normalizeSerpApiFlight(item, index, fallback, returnItem);
    if (flight) {
      normalized.push({
        ...flight,
        id: flight.bookingToken || flight.departureToken || `searchapi-google-flights-${index}`,
        source: "SearchApi Google Flights",
        isRoundTrip: Boolean(flight.inbound),
        aiReason: ret
          ? (flight.inbound ? "AI prefers this SearchApi Google Flights round-trip option because it has usable outbound, return, route and price support." : "SearchApi returned a priced round-trip offer, but detailed return segments are shown on the official/provider booking page.")
          : "SearchApi returned this priced one-way flight option.",
      });
    }
  }

  const unique = new Map<string, FlightOption>();
  normalized.forEach((flight) => {
    const key = [flight.airline, flight.outbound?.departureTime || flight.departureTime, flight.price, flight.stops].join("|");
    const existing = unique.get(key);
    if (!existing || rankFlight(flight) < rankFlight(existing)) unique.set(key, flight);
  });
  const flights = Array.from(unique.values()).sort((a, b) => rankFlight(a) - rankFlight(b));

  if (flights.length > 0) {
    return {
      source: "SearchApi Google Flights",
      status: "live",
      diagnostics: {
        attempt: summarizeSearchApiAttempt(attempt),
        attempts: attempts.map(a => ({ origin: a.origin, dest: a.dest, ok: a.attempt?.ok, status: a.attempt?.status, count: a.count, error: a.attempt?.error, params: { flight_type: a.params?.flight_type, departure_id: a.params?.departure_id, arrival_id: a.params?.arrival_id, outbound_date: a.params?.outbound_date, return_date: a.params?.return_date, currency: a.params?.currency, travel_class: a.params?.travel_class } })).slice(0, 8),
        count: flights.length,
        returnAttempts,
        roundTripCount: flights.filter(f => f.isRoundTrip).length,
        supports: ["one_way", "round_trip", "multi_city", "price", "booking_token", "booking_options", "price_insights"],
        note: "SearchApi Google Flights is used as an extra live priced-flight provider between SerpApi and Duffel sandbox.",
      },
      flights: flights.slice(0, 20),
    };
  }

  return {
    source: "SearchApi Google Flights",
    status: attempt?.ok ? "live_no_results" : "api_failed",
    diagnostics: {
      attempt: summarizeSearchApiAttempt(attempt),
      attempts: attempts.map(a => ({ origin: a.origin, dest: a.dest, ok: a.attempt?.ok, status: a.attempt?.status, count: a.count, error: a.attempt?.error, params: { flight_type: a.params?.flight_type, departure_id: a.params?.departure_id, arrival_id: a.params?.arrival_id, outbound_date: a.params?.outbound_date, return_date: a.params?.return_date, currency: a.params?.currency, travel_class: a.params?.travel_class } })).slice(0, 12),
      message: attempt.error || "SearchApi Google Flights returned no usable priced flight options for the selected route/date.",
      requested: { from, to, fromCandidates, toCandidates, departureDate: dep, returnDate: ret, adults: Math.max(1, adults || 1), currency: requestedCurrency, searchCurrency, cabinClass: cabinLabel(cabinClass), travelClass: serpTravelClass(cabinClass) },
    },
    flights: [] as FlightOption[],
  };
}



function duffelCabinClass(cabinClass: string) {
  const c = String(cabinClass || "economy").toLowerCase().replace(/[\s-]+/g, "_");
  if (c.includes("first")) return "first";
  if (c.includes("business")) return "business";
  if (c.includes("premium")) return "premium_economy";
  return "economy";
}

function isoDurationToText(value: any) {
  const raw = textValue(value);
  const match = raw.match(/P(?:\d+D)?T(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!match) return raw;
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  return hours ? `${hours}h ${minutes ? `${minutes}m` : ""}`.trim() : `${minutes}m`;
}

function minutesFromIsoDuration(value: any): number | undefined {
  const raw = textValue(value);
  const match = raw.match(/P(?:\d+D)?T(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!match) return undefined;
  return Number(match[1] || 0) * 60 + Number(match[2] || 0);
}

async function duffelJson(path: string, options: RequestInit = {}) {
  try {
    const res = await fetch(`https://api.duffel.com${path}`, {
      ...options,
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${DUFFEL_API_KEY}`,
        "Duffel-Version": "v2",
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    const text = await res.text();
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
    const apiError = data?.errors?.[0]?.message || data?.error || data?.message;
    return { ok: res.ok && !apiError, status: res.status, path, data, error: apiError || (res.ok ? undefined : `HTTP ${res.status}`) };
  } catch (error: any) {
    return { ok: false, status: 0, path, data: null, error: error?.message || "Duffel sandbox request failed" };
  }
}

function summarizeDuffelAttempt(attempt: any) {
  const offers = Array.isArray(attempt?.data?.data?.offers) ? attempt.data.data.offers : [];
  return {
    ok: attempt?.ok,
    status: attempt?.status,
    error: attempt?.error,
    path: attempt?.path,
    offerRequestId: attempt?.data?.data?.id,
    offersCount: offers.length,
    keys: Object.keys(attempt?.data?.data || attempt?.data || {}).slice(0, 20),
  };
}

function normalizeDuffelOffer(offer: any, index: number, fallback: any): FlightOption | null {
  const slices = Array.isArray(offer?.slices) ? offer.slices : [];
  const outboundSlice = slices[0] || {};
  const inboundSlice = slices[1] || null;
  const outboundSegments = Array.isArray(outboundSlice?.segments) ? outboundSlice.segments : [];
  const inboundSegments = Array.isArray(inboundSlice?.segments) ? inboundSlice.segments : [];
  const first = outboundSegments[0] || {};
  const last = outboundSegments[outboundSegments.length - 1] || first;
  const returnFirst = inboundSegments[0] || {};
  const returnLast = inboundSegments[inboundSegments.length - 1] || returnFirst;
  const originalPrice = moneyValue(offer?.total_amount, offer?.base_amount);
  const originalCurrency = normalizeCurrencyCode(offer?.total_currency || offer?.base_currency || fallback.currency);
  const price = convertCurrency(originalPrice, originalCurrency, fallback.currency);
  const originCode = textValue(first?.origin?.iata_code, outboundSlice?.origin?.iata_code, fallback.from).toUpperCase();
  const destinationCode = textValue(last?.destination?.iata_code, outboundSlice?.destination?.iata_code, fallback.to).toUpperCase();
  if (!originCode || !destinationCode || !price) return null;
  const airline = textValue(
    first?.marketing_carrier?.name,
    first?.operating_carrier?.name,
    offer?.owner?.name,
    "Duffel sandbox carrier"
  );
  const flightNumbers = outboundSegments.map((seg: any) => textValue(seg?.marketing_carrier_flight_number, seg?.operating_carrier_flight_number)).filter(Boolean);
  const returnFlightNumbers = inboundSegments.map((seg: any) => textValue(seg?.marketing_carrier_flight_number, seg?.operating_carrier_flight_number)).filter(Boolean);
  const outboundDurationMinutes = minutesFromIsoDuration(outboundSlice?.duration);
  const inboundDurationMinutes = minutesFromIsoDuration(inboundSlice?.duration);
  const outbound: FlightLeg = {
    route: `${fallback.departure} (${originCode}) → ${fallback.destination} (${destinationCode})`,
    airline,
    flightNumber: flightNumbers.join(", ") || undefined,
    departureTime: textValue(first?.departing_at, fallback.departureDate),
    arrivalTime: textValue(last?.arriving_at, fallback.departureDate),
    duration: isoDurationToText(outboundSlice?.duration) || "Duration not returned",
    stops: Math.max(0, outboundSegments.length - 1),
  };
  const inbound: FlightLeg | null = inboundSegments.length ? {
    route: `${fallback.destination} (${textValue(returnFirst?.origin?.iata_code, fallback.to).toUpperCase()}) → ${fallback.departure} (${textValue(returnLast?.destination?.iata_code, fallback.from).toUpperCase()})`,
    airline: textValue(returnFirst?.marketing_carrier?.name, returnFirst?.operating_carrier?.name, airline),
    flightNumber: returnFlightNumbers.join(", ") || undefined,
    departureTime: textValue(returnFirst?.departing_at, fallback.returnDate),
    arrivalTime: textValue(returnLast?.arriving_at, fallback.returnDate),
    duration: isoDurationToText(inboundSlice?.duration) || "Duration not returned",
    stops: Math.max(0, inboundSegments.length - 1),
  } : null;
  const stops = (outbound.stops || 0) + (inbound?.stops || 0);
  const totalDurationMinutes = (outboundDurationMinutes || 9999) + (inbound ? (inboundDurationMinutes || 9999) : 0);
  const aiScore = (price || 999999) + stops * 130 + totalDurationMinutes * 0.7;
  return {
    id: textValue(offer?.id, `duffel-sandbox-offer-${index}`),
    source: "Duffel Sandbox Offers",
    route: inbound ? `${outbound.route} + Return` : outbound.route,
    originCode,
    destinationCode,
    departureId: fallback.from,
    arrivalId: fallback.to,
    outboundDate: fallback.departureDate,
    returnDate: fallback.returnDate,
    airline,
    flightNumber: outbound.flightNumber,
    price,
    currency: fallback.currency,
    originalPrice,
    originalCurrency,
    departureTime: outbound.departureTime,
    arrivalTime: inbound?.arrivalTime || outbound.arrivalTime,
    duration: inbound ? `${outbound.duration} + ${inbound.duration}` : outbound.duration,
    stops,
    bookingToken: textValue(offer?.id),
    bookingUrl: "",
    outbound,
    inbound,
    isRoundTrip: Boolean(inbound),
    totalDurationMinutes,
    durationMinutes: outboundDurationMinutes,
    aiScore,
    aiReason: "AI selected this Duffel sandbox offer by total price, stops, duration, cabin class and route match. It is test-only; no real payment or live booking is created.",
    rawKeys: Object.keys(offer || {}).slice(0, 20),
    cabinClass: fallback.cabinClass || "Economy",
  };
}

async function getDuffelSandboxFlights(departure: string, destination: string, departureDate: string, returnDate: string, adults: number, currency: string, from: string, to: string, cabinClass: string = "ECONOMY") {
  if (!from || !to) return { source: "Duffel Sandbox", status: "airport_not_selected", diagnostics: { message: "Select real IATA airports before using Duffel sandbox." }, flights: [] as FlightOption[] };
  if (!DUFFEL_API_KEY) return { source: "Duffel Sandbox", status: "api_key_missing", diagnostics: { message: "DUFFEL_API_KEY is missing from .env.local" }, flights: [] as FlightOption[] };
  const dep = isoDate(departureDate);
  const ret = isoDate(returnDate);
  const requestedCurrency = normalizeCurrencyCode(currency);
  const cabin = duffelCabinClass(cabinClass);
  const passengerCount = Math.max(1, adults || 1);
  const passengers = Array.from({ length: passengerCount }).map(() => ({ type: "adult" }));
  const slices: any[] = [{ origin: from, destination: to, departure_date: dep }];
  if (ret) slices.push({ origin: to, destination: from, departure_date: ret });
  const body = {
    data: {
      slices,
      passengers,
      cabin_class: cabin,
    },
  };
  const attempt = await duffelJson("/air/offer_requests?return_offers=true", { method: "POST", body: JSON.stringify(body) });
  const offers = Array.isArray(attempt?.data?.data?.offers) ? attempt.data.data.offers : [];
  const fallback = { from, to, departure, destination, departureDate: dep, returnDate: ret, currency: requestedCurrency, cabinClass: cabinLabel(cabinClass) };
  const flights = offers
    .map((offer: any, i: number) => normalizeDuffelOffer(offer, i, fallback))
    .filter(Boolean)
    .sort((a: any, b: any) => rankFlight(a) - rankFlight(b))
    .slice(0, 20) as FlightOption[];
  return {
    source: "Duffel Sandbox Offers",
    status: flights.length ? "live" : (attempt.ok ? "empty" : "api_failed"),
    diagnostics: {
      attempt: summarizeDuffelAttempt(attempt),
      requested: { from, to, departureDate: dep, returnDate: ret, adults: passengerCount, cabinClass: cabin, currency: requestedCurrency },
      note: "Duffel is connected only as a sandbox/test flight provider. SmartTravel does not create Duffel orders, real payments, or live bookings.",
    },
    flights,
  };
}

type FlightProviderChoice = "AUTO" | "SERPAPI" | "SERPAPI_1" | "SERPAPI_2" | "SERPAPI_3" | "SEARCHAPI" | "DUFFEL";

function normalizeFlightProviderChoice(value: any): FlightProviderChoice {
  const v = String(value || "AUTO").trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (v === "SERPAPI_1" || v === "SERPAPI1" || v === "SERP_API_1") return "SERPAPI_1";
  if (v === "SERPAPI_2" || v === "SERPAPI2" || v === "SERP_API_2") return "SERPAPI_2";
  if (v === "SERPAPI_3" || v === "SERPAPI3" || v === "SERP_API_3") return "SERPAPI_3";
  if (v === "SERPAPI" || v === "SERP_API" || v === "GOOGLE_FLIGHTS") return "SERPAPI";
  if (v === "SEARCHAPI" || v === "SEARCH_API" || v === "SEARCHAPI_GOOGLE_FLIGHTS") return "SEARCHAPI";
  if (v === "DUFFEL" || v === "DUFFEL_SANDBOX" || v === "DUFFEL_TEST") return "DUFFEL";
  return "AUTO";
}

function buildGoogleFlightsSearchUrl(from: string, to: string, departureDate: string, returnDate?: string) {
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(`${from} to ${to} ${departureDate}${returnDate ? ` return ${returnDate}` : ""}`)}`;
}

async function getFlights(departure: string, destination: string, departureDate: string, returnDate: string, adults: number, currency: string, from: string, to: string, cabinClass: string = "ECONOMY", providerChoiceRaw: any = "AUTO", travelStyle: string = "MODERATE", totalBudget: number = 0) {
  const providerChoice = normalizeFlightProviderChoice(providerChoiceRaw);


  let preferredSearchApiResult: any = null;
  if (providerChoice === "SEARCHAPI") {
    preferredSearchApiResult = await getSearchApiGoogleFlights(departure, destination, departureDate, returnDate, adults, currency, from, to, cabinClass);
    if (preferredSearchApiResult.flights?.length) {
      return {
        ...preferredSearchApiResult,
        providerChoice,
        diagnostics: {
          ...(preferredSearchApiResult.diagnostics || {}),
          requestedProvider: providerChoice,
          providerMode: "SearchApi Google Flights live priced-flight search; no SmartTravel mock generated.",
        },
      };
    }
    // Do not stop the whole plan when the selected live provider returns empty.
    // Continue into SerpApi/Duffel fallback so SearchApi and SerpApi can coexist without blocking each other.
  }

  if (providerChoice === "DUFFEL") {
    const duffel = await getDuffelSandboxFlights(departure, destination, departureDate, returnDate, adults, currency, from, to, cabinClass);
    return {
      ...duffel,
      providerChoice,
      diagnostics: {
        ...(duffel.diagnostics || {}),
        requestedProvider: providerChoice,
        providerMode: "Duffel sandbox/test offers only; no order creation, real booking, or payment.",
      },
    };
  }

  const explicitSerpSlot = providerChoice === "SERPAPI_1" || providerChoice === "SERPAPI_2" || providerChoice === "SERPAPI_3" ? providerChoice : null;
  const serpOrder = explicitSerpSlot
    ? SERPAPI_KEYS.filter((item) => item.slot === explicitSerpSlot)
    : (providerChoice === "SERPAPI" ? SERPAPI_KEYS.filter((item) => item.slot === "SERPAPI_1") : SERPAPI_KEYS);

  const serpAttempts: any[] = [];
  const selectedSearchApiProviderFailed = providerChoice === "SEARCHAPI" && Boolean(preferredSearchApiResult) && !preferredSearchApiResult.flights?.length;
  let serp: any = { source: "SerpApi", status: "api_key_missing", diagnostics: { message: "No SerpApi keys configured", availableSlots: SERPAPI_KEYS.map(k => k.slot) }, flights: [] as FlightOption[] };

  for (const keyConfig of serpOrder) {
    serp = await getSerpApiFlights(departure, destination, departureDate, returnDate, adults, currency, from, to, cabinClass, keyConfig);
    serpAttempts.push({ slot: keyConfig.slot, label: keyConfig.label, status: serp.status, diagnostics: serp.diagnostics });
    if (serp.flights?.length) {
      return {
        ...serp,
        providerChoice,
        diagnostics: {
          ...(serp.diagnostics || {}),
          requestedProvider: providerChoice,
          providerMode: providerChoice === "AUTO" ? "SerpApi #3 → SerpApi #2 → SerpApi #1, then SearchApi, then Duffel sandbox. Demo fallback disabled." : `${keyConfig.label} only`,
          serpApiAttempts: serpAttempts,
          selectedSearchApiProviderFailed,
        },
      };
    }
  }

  const selectedSerpProviderFailed = providerChoice === "SERPAPI" || Boolean(explicitSerpSlot);

  const searchApi = preferredSearchApiResult || await getSearchApiGoogleFlights(departure, destination, departureDate, returnDate, adults, currency, from, to, cabinClass);
  if (searchApi.flights?.length) {
    return {
      ...searchApi,
      providerChoice,
      diagnostics: {
        ...(searchApi.diagnostics || {}),
        requestedProvider: providerChoice,
        providerMode: selectedSerpProviderFailed
          ? "Selected SerpApi returned no usable result, so SmartTravel automatically opened the SearchApi live fallback."
          : (selectedSearchApiProviderFailed ? "SearchApi was selected first and worked after SmartTravel retried through the shared fallback flow." : "Auto fallback used SearchApi Google Flights after all SerpApi keys returned no usable results."),
        serpApi: serp.diagnostics,
        serpApiAttempts: serpAttempts,
        selectedSerpProviderFailed,
      },
    };
  }

  const duffel = await getDuffelSandboxFlights(departure, destination, departureDate, returnDate, adults, currency, from, to, cabinClass);
  if (duffel.flights?.length) {
    return {
      ...duffel,
      providerChoice,
      diagnostics: {
        ...(duffel.diagnostics || {}),
        requestedProvider: providerChoice,
        providerMode: "Auto fallback used Duffel sandbox after all SerpApi keys and SearchApi returned no usable results.",
        serpApi: serp.diagnostics,
        serpApiAttempts: serpAttempts,
        searchApi: searchApi.diagnostics,
      },
    };
  }

  return {
    source: "No flight provider returned priced offers",
    status: "api_failed",
    providerChoice,
    diagnostics: {
      message: "SerpApi #3, SerpApi #2, SerpApi #1, SearchApi and Duffel did not return usable flight results. Demo flight fallback is disabled, so no fake flight was generated.",
      requestedProvider: providerChoice,
      serpApi: serp.diagnostics,
      searchApi: searchApi.diagnostics,
      duffel: duffel.diagnostics,
      serpApiAttempts: serpAttempts,
    },
    flights: [] as FlightOption[],
  };
}

type HotelOption = {
  id: string;
  hotelId: string;
  source: string;
  name: string;
  city?: string;
  country?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  reviewScore?: number;
  reviewCount?: number;
  stars?: number;
  price?: number;
  currency: string;
  originalPrice?: number;
  originalCurrency?: string;
  priceLabel?: string;
  image?: string;
  photos?: string[];
  amenities?: string[];
  checkIn?: string;
  checkOut?: string;
  nights?: number;
  roomName?: string;
  bookingUrl?: string;
  aiScore?: number;
  aiReason?: string;
  rawKeys?: string[];
  cabinClass?: string;
  serpApiSlot?: string;
  serpApiLabel?: string;
};

async function searchApiHotelsJson(params: Record<string, string | number | undefined>) {
  if (!SEARCHAPI_KEY) {
    return { ok: false, status: 0, url: "https://www.searchapi.io/api/v1/search", data: null, error: "SEARCHAPI_KEY is missing from .env.local" };
  }
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") search.set(key, String(value));
  });
  search.set("engine", "google_hotels");
  search.set("api_key", SEARCHAPI_KEY);
  const url = `https://www.searchapi.io/api/v1/search?${search.toString()}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
    const apiError = data?.error || data?.search_metadata?.error || data?.message;
    return { ok: res.ok && !apiError, status: res.status, url, data, error: apiError || (res.ok ? undefined : `HTTP ${res.status}`) };
  } catch (error: any) {
    return { ok: false, status: 0, url, data: null, error: error?.message || "SearchAPI Google Hotels request failed" };
  }
}

function summarizeSearchApiHotelAttempt(attempt: any) {
  const safeKey = SEARCHAPI_KEY || "SEARCHAPI_KEY";
  const data = attempt?.data || {};
  return {
    ok: attempt?.ok,
    status: attempt?.status,
    error: attempt?.error,
    url: attempt?.url ? attempt.url.replace(safeKey, "SEARCHAPI_KEY") : "",
    keys: Object.keys(data || {}).slice(0, 25),
    properties: Array.isArray(data?.properties) ? data.properties.length : 0,
    totalResults: data?.search_information?.total_results,
    rawPreview: typeof data?.raw === "string" ? data.raw.slice(0, 300) : undefined,
  };
}

function collectStrings(value: any, limit = 8): string[] {
  const out: string[] = [];
  const walk = (v: any) => {
    if (out.length >= limit || v === null || v === undefined) return;
    if (typeof v === "string") {
      const t = v.trim();
      if (t && !out.includes(t)) out.push(t);
      return;
    }
    if (Array.isArray(v)) return v.forEach(walk);
    if (typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(value);
  return out.slice(0, limit);
}

function photoUrlsFrom(value: any): string[] {
  const out: string[] = [];
  const walk = (v: any) => {
    if (out.length >= 8 || v === null || v === undefined) return;
    if (typeof v === "string") {
      const t = v.trim();
      if (/^https?:\/\//i.test(t) && !out.includes(t)) out.push(t);
      return;
    }
    if (Array.isArray(v)) return v.forEach(walk);
    if (typeof v === "object") {
      [v.url, v.photo_url, v.photoUrl, v.src, v.large, v.medium, v.thumbnail, v.original].forEach(walk);
      Object.values(v).forEach(walk);
    }
  };
  walk(value);
  return out.slice(0, 8);
}

function normalizeSearchApiHotel(item: any, index: number, fallback: any): HotelOption | null {
  const hotelId = textValue(item?.property_token, item?.data_id, item?.id, `searchapi-${index}`);
  const name = textValue(item?.name, item?.title);
  if (!name) return null;
  const originalCurrency = "USD";
  const originalPrice = moneyValue(item?.total_price?.extracted_price, item?.price_per_night?.extracted_price, item?.total_price?.price, item?.price_per_night?.price);
  const price = convertCurrency(originalPrice, originalCurrency, fallback.currency);
  const photos = photoUrlsFrom(item?.images);
  const rating = numberValue(item?.rating);
  const reviewCount = numberValue(item?.reviews);
  const stars = numberValue(item?.extracted_hotel_class, item?.hotel_class);
  const lat = numberValue(item?.gps_coordinates?.latitude, item?.latitude);
  const lng = numberValue(item?.gps_coordinates?.longitude, item?.longitude);
  const amenities = collectStrings(item?.amenities, 8);
  const nights = fallback.nights;
  const perNight = convertCurrency(moneyValue(item?.price_per_night?.extracted_price, item?.price_per_night?.price), originalCurrency, fallback.currency);
  const score = (price || 999999) - (rating || 0) * 250 - (stars || 0) * 100 - Math.min(reviewCount || 0, 2000) * 0.04;
  return {
    id: `searchapi-google-hotels-${hotelId}-${index}`,
    hotelId,
    source: "SearchAPI Google Hotels",
    name,
    city: textValue(item?.city, fallback.destination),
    country: textValue(item?.country),
    address: textValue(item?.address, item?.description),
    latitude: lat,
    longitude: lng,
    rating,
    reviewScore: rating,
    reviewCount,
    stars,
    price,
    currency: fallback.currency,
    originalPrice,
    originalCurrency,
    priceLabel: textValue(item?.total_price?.price, item?.price_per_night?.price),
    image: photos[0],
    photos,
    amenities,
    checkIn: fallback.checkIn,
    checkOut: fallback.checkOut,
    nights,
    roomName: perNight ? `${fallback.currency} ${perNight}/night` : textValue(item?.hotel_class, item?.type),
    bookingUrl: textValue(item?.link),
    aiScore: score,
    aiReason: price ? "AI ranks this real SearchAPI Google Hotels result using live price, rating, reviews, stars and budget fit." : "Real hotel returned by SearchAPI Google Hotels, but no usable price was included.",
    rawKeys: Object.keys(item || {}).slice(0, 20),
  };
}

async function getHotels(
  destination: string,
  checkInDate: string,
  checkOutDate: string,
  travelers: number,
  rooms: number,
  currency: string,
  travelStyle: string = "MODERATE",
  hotelBudget: number = 0,
  hotelQuality: string = "ANY",
  accommodationPreference: string = "ANY",
) {
  const nights = Math.max(1, daysBetweenInclusive(checkInDate, checkOutDate) - 1);
  const checkIn = isoDate(checkInDate);
  const checkOut = isoDate(checkOutDate || checkInDate);
  const fallback = { currency, nights, destination, checkIn, checkOut };

  if (!SEARCHAPI_KEY) {
    return {
      source: "none",
      status: "api_key_missing",
      diagnostics: { message: "SEARCHAPI_KEY (or GOOGLE_HOTELS_API_KEY) is missing from .env.local" },
      hotels: [] as HotelOption[],
    };
  }

  const sortPref = (() => {
    const q = String(hotelQuality || "").toUpperCase();
    if (q === "LUXURY" || q === "HIGH") return "8"; // highest rating
    if (q === "BUDGET" || q === "LOW") return "3"; // lowest price
    return undefined;
  })();

  const attempts: any[] = [];
  const queries = [
    { q: `hotels in ${destination}`, label: "primary" },
    { q: destination, label: "destination_only" },
  ];

  for (const query of queries) {
    const params: Record<string, string | number | undefined> = {
      q: query.q,
      check_in_date: checkIn,
      check_out_date: checkOut,
      adults: Math.max(1, Math.round(travelers)),
      currency,
      gl: "us",
      hl: "en",
    };
    if (rooms && rooms > 0) params.rooms = Math.max(1, Math.round(rooms));
    if (sortPref) params.sort_by = sortPref;

    const attempt = await searchApiHotelsJson(params);
    attempts.push({ ...attempt, label: query.label, q: query.q });

    const properties = Array.isArray(attempt?.data?.properties) ? attempt.data.properties : [];
    const hotels = properties
      .map((item: any, index: number) => normalizeSearchApiHotel(item, index, fallback))
      .filter(Boolean)
      .sort((a: HotelOption, b: HotelOption) => rankHotel(a) - rankHotel(b))
      .slice(0, 20) as HotelOption[];

    if (hotels.length) {
      return {
        source: "SearchAPI Google Hotels",
        status: "live",
        diagnostics: {
          search: summarizeSearchApiHotelAttempt(attempt),
          attempts: attempts.map(summarizeSearchApiHotelAttempt).slice(-4),
          requested: { destination, checkIn, checkOut, travelers, rooms, nights, currency, hotelQuality, accommodationPreference, hotelBudget, travelStyle },
        },
        hotels,
      };
    }
  }

  return {
    source: "SearchAPI Google Hotels",
    status: "live_no_results",
    diagnostics: {
      attempts: attempts.map(summarizeSearchApiHotelAttempt),
      requested: { destination, checkIn, checkOut, travelers, rooms, nights, currency, hotelQuality, accommodationPreference, hotelBudget, travelStyle },
      message: "SearchAPI Google Hotels was reached but returned no usable hotel results for this destination/date range. No mock hotels are generated.",
    },
    hotels: [] as HotelOption[],
  };
}

function rankHotel(h: HotelOption): number {
  if (typeof h.aiScore === "number") return h.aiScore;
  return (h.price || 999999) - (h.reviewScore || 0) * 250 - (h.stars || 0) * 100;
}


function allocateSmartBudget(input: {
  totalBudget: number;
  flightPrice?: number;
  hotelPrice?: number;
  days?: number;
  travelerCount?: number;
  travelStyle?: string;
  travelerType?: string;
  destination?: string;
  optional?: { food?: number; shopping?: number; transport?: number; activities?: number };
}) {
  const total = Math.max(0, Math.round(Number(input.totalBudget || 0)));
  const days = Math.max(1, Math.round(Number(input.days || 1)));
  const travelers = Math.max(1, Math.round(Number(input.travelerCount || 1)));
  const style = String(input.travelStyle || "MODERATE").toUpperCase();
  const travelerType = String(input.travelerType || "SOLO").toUpperCase();
  const destination = String(input.destination || "").toLowerCase();
  const cityCost = destination.includes("paris") || destination.includes("london") || destination.includes("dubai") ? 1.25 : destination.includes("istanbul") || destination.includes("baku") ? 0.95 : 1;

  const flights = Math.max(0, Math.round(Number(input.flightPrice || 0)));
  const hotels = Math.max(0, Math.round(Number(input.hotelPrice || 0)));
  let pool = Math.max(0, total - flights - hotels);

  const requested = {
    food: Math.max(0, Math.round(Number(input.optional?.food || 0))),
    shopping: Math.max(0, Math.round(Number(input.optional?.shopping || 0))),
    transport: Math.max(0, Math.round(Number(input.optional?.transport || 0))),
    activities: Math.max(0, Math.round(Number(input.optional?.activities || 0))),
  };

  const result: Record<string, number> = { flights, hotels, food: 0, transport: 0, shopping: 0, activities: 0, emergency: 0, remaining: 0, overBudget: Math.max(0, flights + hotels - total) };

  for (const key of ["food", "shopping", "transport", "activities"] as const) {
    if (requested[key] > 0) {
      const value = Math.min(pool, requested[key]);
      result[key] = value;
      pool -= value;
    }
  }

  const dailyBase = style === "LUXURY" || style === "BUSINESS" ? 70 : style === "BUDGET" || style === "BACKPACKER" ? 28 : 45;
  const activityBase = style === "ADVENTURE" ? 38 : style === "LUXURY" ? 50 : style === "BUDGET" ? 18 : 28;
  const transportBase = travelerType === "FAMILY" ? 24 : style === "BUSINESS" ? 35 : style === "BUDGET" ? 12 : 18;
  const minimums: Record<string, number> = {
    food: Math.round(dailyBase * days * travelers * cityCost),
    transport: Math.round(transportBase * days * Math.max(1, Math.ceil(travelers / 2)) * cityCost),
    activities: Math.round(activityBase * days * travelers * cityCost),
    shopping: Math.round((style === "LUXURY" ? 45 : style === "BUDGET" || style === "BACKPACKER" ? 8 : 22) * days * cityCost),
  };

  for (const key of ["food", "transport", "activities", "shopping"] as const) {
    if (result[key] > 0) continue;
    const value = Math.min(pool, minimums[key]);
    result[key] = value;
    pool -= value;
  }

  const profiles: Record<string, Record<string, number>> = {
    BUDGET: { food: 0.30, transport: 0.23, activities: 0.20, shopping: 0.08, emergency: 0.19 },
    BACKPACKER: { food: 0.29, transport: 0.25, activities: 0.22, shopping: 0.06, emergency: 0.18 },
    MODERATE: { food: 0.26, transport: 0.18, activities: 0.22, shopping: 0.16, emergency: 0.18 },
    LUXURY: { food: 0.25, transport: 0.15, activities: 0.22, shopping: 0.25, emergency: 0.13 },
    BUSINESS: { food: 0.23, transport: 0.26, activities: 0.12, shopping: 0.12, emergency: 0.27 },
    ADVENTURE: { food: 0.22, transport: 0.18, activities: 0.36, shopping: 0.07, emergency: 0.17 },
  };
  const profile = profiles[style] || profiles.MODERATE;
  const adjustable = ["food", "transport", "activities", "shopping", "emergency"] as const;
  const weightTotal = adjustable.reduce((sum, key) => sum + (profile[key] || 0), 0) || 1;
  for (const key of adjustable) {
    const add = Math.round(pool * ((profile[key] || 0) / weightTotal));
    result[key] += add;
  }

  const used = result.flights + result.hotels + result.food + result.transport + result.shopping + result.activities + result.emergency;
  const drift = total - used;
  result.emergency = Math.max(0, result.emergency + drift);
  result.remaining = Math.max(0, total - (result.flights + result.hotels + result.food + result.transport + result.shopping + result.activities + result.emergency));
  result.overBudget = Math.max(0, (result.flights + result.hotels) - total);

  const requiredNonFixed = Math.max(0, minimums.food + minimums.transport + minimums.activities + minimums.shopping);
  const affordabilityGap = Math.max(0, flights + hotels + requiredNonFixed - total);
  const confidence = affordabilityGap > 0 ? "LOW" : result.emergency < total * 0.05 ? "MEDIUM" : "HIGH";
  return {
    flights: result.flights, hotels: result.hotels, food: result.food, transport: result.transport, shopping: result.shopping, activities: result.activities, emergency: result.emergency, remaining: result.remaining, overBudget: result.overBudget, affordabilityGap, confidence,
    aiSummary: affordabilityGap > 0
      ? `Budget risk: live flight + hotel + minimum daily costs exceed the budget by about ${affordabilityGap}. AI recommends cheaper flight/hotel or less shopping/activities.`
      : `AI divided the budget using live flight/hotel prices, ${days} day(s), ${travelers} traveler(s), ${style.toLowerCase()} style and destination cost level.`,
  } as any;
}

function allocateBudgetWithFlight(totalBudget: number, flightPrice: number, travelStyle: string, optional: { food?: number; shopping?: number; transport?: number; activities?: number }) {
  return allocateSmartBudget({ totalBudget, flightPrice, travelStyle, optional });
}




type PlaceOption = {
  id: string;
  name: string;
  category: "attraction" | "restaurant" | "shopping" | "entertainment" | "nature" | "other";
  address?: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  distanceMeters?: number;
  source: string;
  website?: string;
  openingHours?: string;
  tags?: string[];
  estimatedCost?: number;
  aiReason?: string;
};

type WeatherDay = {
  date: string;
  maxTempC?: number;
  minTempC?: number;
  precipitationMm?: number;
  weatherCode?: number;
  note: string;
};

function buildGeoapifyCategories(interests: string[]) {
  const normalized = interests.map((x) => x.toLowerCase());
  const categories = new Set<string>();
  categories.add("tourism.sights");
  categories.add("tourism.attraction");
  categories.add("catering.restaurant");
  if (normalized.some((x) => x.includes("museum") || x.includes("culture") || x.includes("history"))) {
    categories.add("entertainment.museum");
    categories.add("heritage");
  }
  if (normalized.some((x) => x.includes("shopping"))) categories.add("commercial.shopping_mall");
  if (normalized.some((x) => x.includes("nightlife"))) categories.add("entertainment");
  if (normalized.some((x) => x.includes("nature") || x.includes("beach") || x.includes("family"))) {
    categories.add("leisure.park");
    categories.add("beach");
  }
  return Array.from(categories).join(",");
}

function normalizePlaceCategory(feature: any): PlaceOption["category"] {
  const cats = Array.isArray(feature?.properties?.categories) ? feature.properties.categories.join(" ").toLowerCase() : "";
  if (cats.includes("catering")) return "restaurant";
  if (cats.includes("commercial")) return "shopping";
  if (cats.includes("museum") || cats.includes("tourism") || cats.includes("heritage")) return "attraction";
  if (cats.includes("entertainment")) return "entertainment";
  if (cats.includes("beach") || cats.includes("park") || cats.includes("leisure")) return "nature";
  return "other";
}

async function geoapifyJson(url: string) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
    const apiError = data?.error || data?.message;
    return { ok: res.ok && !apiError, status: res.status, url, data, error: apiError || (res.ok ? undefined : `HTTP ${res.status}`) };
  } catch (error: any) {
    return { ok: false, status: 0, url, data: null, error: error?.message || "Geoapify request failed" };
  }
}

function maskGeoUrl(url: string) {
  return GEOAPIFY_API_KEY ? url.replace(GEOAPIFY_API_KEY, "GEOAPIFY_API_KEY") : url;
}

async function geocodeDestination(destination: string) {
  if (!GEOAPIFY_API_KEY) return { status: "api_key_missing", location: null as any, diagnostics: { message: "GEOAPIFY_API_KEY is missing from .env.local" } };
  const params = new URLSearchParams({ text: destination, limit: "1", apiKey: GEOAPIFY_API_KEY });
  const attempt = await geoapifyJson(`https://api.geoapify.com/v1/geocode/search?${params.toString()}`) as any;
  const feature = Array.isArray(attempt.data?.features) ? attempt.data.features[0] : null;
  const lon = numberValue(feature?.geometry?.coordinates?.[0], feature?.properties?.lon);
  const lat = numberValue(feature?.geometry?.coordinates?.[1], feature?.properties?.lat);
  if (lat && lon) {
    return {
      status: "live",
      location: { latitude: lat, longitude: lon, city: textValue(feature?.properties?.city, destination), country: textValue(feature?.properties?.country) },
      diagnostics: { ok: attempt.ok, status: attempt.status, url: maskGeoUrl(attempt.url), featureCount: Array.isArray(attempt.data?.features) ? attempt.data.features.length : 0 },
    };
  }
  return { status: "api_failed", location: null as any, diagnostics: { ok: attempt.ok, status: attempt.status, error: attempt.error, url: maskGeoUrl(attempt.url), message: `Geoapify could not geocode ${destination}` } };
}

function normalizeGeoapifyPlace(feature: any, index: number, currency: string): PlaceOption | null {
  const p = feature?.properties || {};
  const coords = feature?.geometry?.coordinates || [];
  const name = textValue(p.name, p.address_line1, p.formatted);
  if (!name) return null;
  const category = normalizePlaceCategory(feature);
  const estimatedCost = category === "restaurant" ? 25 : category === "shopping" ? 50 : category === "attraction" ? 20 : 10;
  return {
    id: textValue(p.place_id, p.datasource?.raw?.osm_id, `geoapify-place-${index}`),
    name,
    category,
    address: textValue(p.formatted, p.address_line2),
    city: textValue(p.city, p.town, p.county),
    country: textValue(p.country),
    latitude: numberValue(p.lat, coords[1]),
    longitude: numberValue(p.lon, coords[0]),
    distanceMeters: numberValue(p.distance),
    source: "Geoapify Places",
    website: textValue(p.website, p.datasource?.raw?.website),
    openingHours: textValue(p.opening_hours),
    tags: Array.isArray(p.categories) ? p.categories.slice(0, 6) : [],
    estimatedCost,
    aiReason: category === "restaurant" ? `Food stop matched to your destination and preferences (${currency} budget aware).` : `Place matched by Geoapify around the selected destination/hotel area.`,
  };
}

async function getPlaces(destination: string, interests: string[], currency: string, center?: { latitude?: number; longitude?: number } | null) {
  if (!GEOAPIFY_API_KEY) return { source: "none", status: "api_key_missing", diagnostics: { message: "GEOAPIFY_API_KEY is missing from .env.local" }, places: [] as PlaceOption[], restaurants: [] as PlaceOption[], location: null as any };
  let location = center?.latitude && center?.longitude ? center : null;
  let geocodeDiagnostics: any = null;
  if (!location) {
    const geo = await geocodeDestination(destination);
    geocodeDiagnostics = geo.diagnostics;
    location = geo.location;
  }
  if (!location?.latitude || !location?.longitude) {
    return { source: "Geoapify Places", status: "api_failed", diagnostics: { geocode: geocodeDiagnostics, message: "Could not resolve destination coordinates for places search." }, places: [] as PlaceOption[], restaurants: [] as PlaceOption[], location: null as any };
  }
  const categories = buildGeoapifyCategories(interests);
  const params = new URLSearchParams({
    categories,
    filter: `circle:${location.longitude},${location.latitude},15000`,
    bias: `proximity:${location.longitude},${location.latitude}`,
    limit: "60",
    apiKey: GEOAPIFY_API_KEY,
  });
  const attempt = await geoapifyJson(`https://api.geoapify.com/v2/places?${params.toString()}`) as any;
  const features = Array.isArray(attempt.data?.features) ? attempt.data.features : [];
  const normalized = features.map((f: any, i: number) => normalizeGeoapifyPlace(f, i, currency)).filter(Boolean) as PlaceOption[];
  const unique = new Map<string, PlaceOption>();
  normalized.forEach((place) => {
    const key = `${place.name}|${place.category}|${Math.round(place.latitude || 0)}|${Math.round(place.longitude || 0)}`;
    if (!unique.has(key)) unique.set(key, place);
  });
  const all = Array.from(unique.values()).sort((a, b) => (a.distanceMeters || 999999) - (b.distanceMeters || 999999));
  const restaurants = all.filter((p) => p.category === "restaurant").slice(0, 12);
  const places = all.filter((p) => p.category !== "restaurant").slice(0, 24);
  return {
    source: "Geoapify Places",
    status: places.length || restaurants.length ? "live" : "api_failed",
    diagnostics: { geocode: geocodeDiagnostics, search: { ok: attempt.ok, status: attempt.status, error: attempt.error, url: maskGeoUrl(attempt.url), features: features.length, places: places.length, restaurants: restaurants.length, categories }, location },
    places,
    restaurants,
    location,
  };
}

function daysBetweenInclusive(startDate: string, endDate: string) {
  const start = new Date(isoDate(startDate));
  const end = new Date(isoDate(endDate || startDate));
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
  return Math.max(1, Math.min(14, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1));
}

async function getWeather(location: { latitude?: number; longitude?: number } | null, startDate: string, endDate: string) {
  if (!location?.latitude || !location?.longitude) return { source: "Open-Meteo", status: "location_missing", diagnostics: { message: "Weather needs destination coordinates." }, forecast: [] as WeatherDay[] };

  const requestedStart = isoDate(startDate);
  const requestedEnd = isoDate(endDate || startDate);
  const requestedDays = daysBetweenInclusive(requestedStart, requestedEnd);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(requestedStart);
  const daysFromToday = Math.floor((start.getTime() - today.getTime()) / 86400000);

  // Open-Meteo's free forecast endpoint is near-term forecast data, not a future-year weather oracle.
  // When the trip date is outside the live forecast window, we still call the live API for the
  // destination's next available forecast window and label it as planning guidance. This prevents
  // the UI from showing a broken/empty weather panel while staying honest about the limitation.
  const useRequestedDates = Number.isFinite(daysFromToday) && daysFromToday >= -1 && daysFromToday <= 15;
  const queryStartDate = useRequestedDates ? requestedStart : today.toISOString().slice(0, 10);
  const queryEnd = new Date(queryStartDate);
  queryEnd.setDate(queryEnd.getDate() + Math.max(0, requestedDays - 1));
  const queryEndDate = queryEnd.toISOString().slice(0, 10);

  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code",
    timezone: "auto",
    start_date: queryStartDate,
    end_date: queryEndDate,
  });
  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    const days = Array.isArray(data?.daily?.time) ? data.daily.time : [];
    const requestedStartDate = new Date(requestedStart);
    const forecast: WeatherDay[] = days.slice(0, requestedDays).map((date: string, i: number) => {
      const precipitation = numberValue(data.daily?.precipitation_sum?.[i]) || 0;
      const maxTemp = numberValue(data.daily?.temperature_2m_max?.[i]);
      const minTemp = numberValue(data.daily?.temperature_2m_min?.[i]);
      const displayDate = useRequestedDates ? date : (() => { const d = new Date(requestedStartDate); d.setDate(requestedStartDate.getDate() + i); return d.toISOString().slice(0, 10); })();
      const baseNote = precipitation >= 5 ? "Rain likely: prefer indoor museums, malls or short taxi transfers." : precipitation > 0 ? "Light rain possible: keep flexible indoor backup." : "Good for outdoor walking and sightseeing.";
      return {
        date: displayDate,
        maxTempC: maxTemp,
        minTempC: minTemp,
        precipitationMm: precipitation,
        weatherCode: numberValue(data.daily?.weather_code?.[i]),
        note: useRequestedDates ? baseNote : `${baseNote} Forecast guidance uses the nearest available Open-Meteo live window because exact future trip dates are outside the forecast range.`,
      };
    });
    return {
      source: "Open-Meteo",
      status: forecast.length ? "live" : "api_failed",
      diagnostics: { ok: res.ok, status: res.status, url, count: forecast.length, requestedStart, requestedEnd, queryStartDate, queryEndDate, exactTripDates: useRequestedDates, apiError: data?.reason || data?.error || null },
      forecast,
    };
  } catch (error: any) {
    return { source: "Open-Meteo", status: "api_failed", diagnostics: { error: error?.message || "Open-Meteo request failed", url }, forecast: [] as WeatherDay[] };
  }
}

type EventOption = {
  id: string;
  name: string;
  source: string;
  city?: string;
  venue?: string;
  address?: string;
  start?: string;
  end?: string;
  url?: string;
  category?: string;
  currency: string;
  minPrice?: number;
  maxPrice?: number;
  aiReason?: string;
};

function normalizeEventbriteEvent(item: any, index: number, currency: string): EventOption | null {
  const id = textValue(item?.id, `eventbrite-${index}`);
  const name = textValue(item?.name?.text, item?.name?.html, item?.name);
  if (!name) return null;
  const venue = item?.venue || item?.online_event ? item?.venue : null;
  const ticket = Array.isArray(item?.ticket_classes) ? item.ticket_classes.find((x: any) => x?.cost || x?.free) : null;
  const minPrice = ticket?.free ? 0 : moneyValue(ticket?.cost?.major_value, ticket?.cost?.display);
  return {
    id,
    name,
    source: "Eventbrite",
    city: textValue(venue?.address?.city, venue?.address?.region),
    venue: textValue(venue?.name),
    address: textValue(venue?.address?.localized_address_display, venue?.address?.address_1),
    start: textValue(item?.start?.local, item?.start?.utc),
    end: textValue(item?.end?.local, item?.end?.utc),
    url: textValue(item?.url),
    category: textValue(item?.category?.name, item?.format?.name, item?.subcategory?.name),
    currency,
    minPrice,
    maxPrice: minPrice,
    aiReason: "Live Eventbrite event matched to the selected destination and travel dates.",
  };
}

async function eventbriteJson(url: string) {
  try {
    const res = await fetch(url, { cache: "no-store", headers: { Authorization: `Bearer ${EVENTBRITE_PRIVATE_TOKEN}` } });
    const text = await res.text();
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
    const apiError = data?.error_description || data?.error || data?.message;
    return { ok: res.ok && !apiError, status: res.status, url, data, error: apiError || (res.ok ? undefined : `HTTP ${res.status}`) };
  } catch (error: any) {
    return { ok: false, status: 0, url, data: null, error: error?.message || "Eventbrite request failed" };
  }
}

function summarizeEventbriteAttempt(attempt: any) {
  const safe = EVENTBRITE_PRIVATE_TOKEN || "EVENTBRITE_PRIVATE_TOKEN";
  return {
    ok: attempt?.ok,
    status: attempt?.status,
    error: attempt?.error,
    url: attempt?.url ? attempt.url.replace(safe, "EVENTBRITE_PRIVATE_TOKEN") : "",
    events: Array.isArray(attempt?.data?.events) ? attempt.data.events.length : 0,
    keys: Object.keys(attempt?.data || {}).slice(0, 20),
  };
}

function addDaysIso(date: string, days: number) {
  const d = new Date(`${isoDate(date)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function getEvents(destination: string, startDate: string, endDate: string, currency: string) {
  if (!EVENTBRITE_PRIVATE_TOKEN) {
    return { source: "none", status: "api_key_missing", diagnostics: { message: "EVENTBRITE_PRIVATE_TOKEN is missing from .env.local" }, events: [] as EventOption[] };
  }

  const baseDestination = destination.includes(",") ? destination : `${destination}`;
  const ranges = [
    { label: "trip_dates", start: isoDate(startDate), end: isoDate(endDate || startDate) },
    { label: "extended_90_days", start: isoDate(startDate), end: addDaysIso(endDate || startDate, 90) },
  ];
  const queries = [baseDestination, "music", "festival", "tour", "museum", "conference"];
  const attempts: any[] = [];

  for (const range of ranges) {
    for (const q of queries) {
      const params = new URLSearchParams({
        q,
        "location.address": baseDestination,
        "start_date.range_start": `${range.start}T00:00:00Z`,
        "start_date.range_end": `${range.end}T23:59:59Z`,
        expand: "venue,category,format,ticket_classes",
        sort_by: "date",
      });
      const attempt = await eventbriteJson(`https://www.eventbriteapi.com/v3/events/search/?${params.toString()}`) as any;
      attempts.push({ ...attempt, label: range.label, q });
      const raw = Array.isArray(attempt.data?.events) ? attempt.data.events : [];
      const events = raw.map((event: any, index: number) => normalizeEventbriteEvent(event, index, currency)).filter(Boolean).slice(0, 16) as EventOption[];
      if (events.length) {
        return {
          source: "Eventbrite",
          status: range.label === "trip_dates" ? "live" : "live_extended_dates",
          diagnostics: { search: summarizeEventbriteAttempt(attempt), attempts: attempts.map(summarizeEventbriteAttempt).slice(-4), requested: { destination: baseDestination, startDate: range.start, endDate: range.end, query: q }, message: range.label === "trip_dates" ? undefined : "No events were found inside the exact trip dates, so SmartTravel expanded the real Eventbrite search window. No mock events are used." },
          events,
        };
      }
    }
  }

  return {
    source: "Eventbrite",
    status: "live_no_results",
    diagnostics: { attempts: attempts.map(summarizeEventbriteAttempt), requested: { destination: baseDestination, startDate: isoDate(startDate), endDate: isoDate(endDate || startDate) }, message: "Eventbrite API was reached, but returned no public usable events for this destination/date range. No mock events are generated." },
    events: [] as EventOption[],
  };
}

function cleanPlanText(value: any, fallback: string) {
  const text = String(value || "").trim();
  if (!text) return fallback;
  // Avoid exposing provider IDs like ke6a6b or internal hashes as restaurant/place names.
  if (/^[a-z0-9_-]{5,14}$/i.test(text) && !/\s/.test(text)) return fallback;
  return text;
}

function moneyText(currency: string, amount: number) {
  const safe = Math.max(0, Math.round(Number(amount || 0)));
  return `${currency} ${safe}`;
}

function buildItinerarySkeleton(input: {
  days: number;
  destination: string;
  departureDate: string;
  returnDate?: string;
  currency: string;
  interests: string[];
  notes?: string;
  pace?: string;
  transportPreference?: string;
  travelerType?: string;
  budgets: { food: number; shopping: number; transport: number; activities: number };
  hotel?: HotelOption | null;
  places?: PlaceOption[];
  restaurants?: PlaceOption[];
  weather?: WeatherDay[];
  selectedFlight?: FlightOption | null;
  events?: EventOption[];
}) {
  const days = Math.max(1, Math.min(14, Math.round(input.days || 1)));
  const interests = Array.isArray(input.interests) && input.interests.length ? input.interests : ["Culture", "Food"];
  const hotelName = input.hotel?.name ? ` near ${input.hotel.name}` : " near the selected hotel area";
  const transport = input.transportPreference || "Mixed taxi + walking";
  const notes = input.notes ? ` Notes: ${input.notes}` : "";
  const perDayFood = Math.round((input.budgets.food || 0) / days);
  const perDayTransport = Math.round((input.budgets.transport || 0) / days);
  const perDayActivities = Math.round((input.budgets.activities || 0) / days);
  const perDayShopping = Math.round((input.budgets.shopping || 0) / days);
  const places = Array.isArray(input.places) ? input.places : [];
  const restaurants = Array.isArray(input.restaurants) ? input.restaurants : [];
  const weather = Array.isArray(input.weather) ? input.weather : [];
  const flight = input.selectedFlight;
  const events = Array.isArray(input.events) ? input.events : [];
  const placeFor = (index: number, fallback: string) => cleanPlanText(places[index % Math.max(places.length, 1)]?.name, fallback);
  const restaurantFor = (index: number) => cleanPlanText(restaurants[index % Math.max(restaurants.length, 1)]?.name, "a well-rated local restaurant near the hotel");
  const weatherFor = (index: number) => weather[index]?.note || "Weather forecast not available; keep the day flexible.";
  const interestFor = (index: number) => interests[index % interests.length];

  return Array.from({ length: days }, (_, idx) => {
    const day = idx + 1;
    const isArrival = day === 1;
    const isLast = day === days;
    const mainInterest = interestFor(idx);
    const primaryPlace = placeFor(idx * 2, `${input.destination} central area`);
    const secondaryPlace = placeFor(idx * 2 + 1, `${input.destination} old town / main square`);
    const foodPlace = restaurantFor(idx);
    const weatherNote = weatherFor(idx);
    const event = events.find((ev: any) => String(ev.start || "").slice(0, 10) === addDaysIso(input.departureDate, idx)) || events[idx % Math.max(events.length, 1)];
    const eventLine = event?.name ? ` Event option: ${event.name}${event.venue ? ` at ${event.venue}` : ""}.` : "";
    const morningCost = isArrival || isLast ? perDayTransport : Math.max(0, Math.round(perDayActivities * 0.45));
    const afternoonCost = isArrival || isLast ? Math.max(0, Math.round(perDayActivities * 0.35)) : Math.max(0, Math.round(perDayActivities * 0.55));
    const eveningCost = isLast ? Math.max(0, Math.round(perDayFood * 0.6)) : perDayFood;
    const shoppingCost = isLast ? 0 : perDayShopping;
    const estimatedDailyCost = Math.max(0, morningCost + afternoonCost + eveningCost + shoppingCost);

    return {
      day,
      title: isArrival ? `Arrival, transfer and first walk in ${input.destination}` : isLast ? `Check-out and return travel day` : `${mainInterest} route: ${primaryPlace} + ${secondaryPlace}`,
      morning: isArrival
        ? `Arrive from ${flight?.outbound?.route || flight?.route || "your departure city"}. Transfer${hotelName}; keep this block light because arrival time matters. Transport plan: ${transport}. Estimated local transfer: ${moneyText(input.currency, morningCost)}.`
        : isLast
          ? `Pack, check out, confirm return flight timing and keep luggage/airport transfer ready. Estimated transfer buffer: ${moneyText(input.currency, morningCost)}.`
          : `Start with ${primaryPlace}. ${weatherNote} Estimated activity/entry budget: ${moneyText(input.currency, morningCost)}.`,
      afternoon: isArrival
        ? `After check-in/rest, do a short orientation around ${primaryPlace}. Keep this light; estimated activity budget: ${moneyText(input.currency, afternoonCost)}.`
        : isLast
          ? `Use only nearby low-risk places such as ${primaryPlace}; avoid far areas before departure. Estimated activity budget: ${moneyText(input.currency, afternoonCost)}.`
          : `Move to ${secondaryPlace}; choose ${transport.toLowerCase()} based on distance. Estimated activity budget: ${moneyText(input.currency, afternoonCost)} and transport budget: ${moneyText(input.currency, perDayTransport)}.`,
      evening: isArrival
        ? `Dinner at/near ${foodPlace}. Estimated dinner budget: ${moneyText(input.currency, eveningCost)}.${notes}${eventLine}`
        : isLast
          ? `Airport transfer / return-flight preparation. Do not schedule long activities after this block. Estimated food/snack budget: ${moneyText(input.currency, eveningCost)}.`
          : `Dinner at ${foodPlace}. Estimated food budget: ${moneyText(input.currency, eveningCost)}${shoppingCost > 0 ? `, optional shopping window: ${moneyText(input.currency, shoppingCost)}` : ""}.${notes}${eventLine}`,
      places: [primaryPlace, secondaryPlace].filter(Boolean),
      restaurant: foodPlace,
      event: event?.name || null,
      weatherNote,
      morningCost,
      afternoonCost,
      eveningCost,
      shoppingCost,
      estimatedDailyCost,
      source: places.length || restaurants.length ? "Geoapify/Open-Meteo assisted itinerary" : "Preference-based planning skeleton",
    };
  });
}

function buildAlternativePlans(totalBudget: number, flightPrice: number, hotelPrice: number, days: number, travelers: number, travelStyle: string, destination: string, optional: any) {
  const cheaper = allocateSmartBudget({ totalBudget: Math.round(totalBudget * 0.85), flightPrice: Math.round(flightPrice * 0.95), hotelPrice: Math.round(hotelPrice * 0.85), days, travelerCount: travelers, travelStyle: "BUDGET", destination, optional });
  const balanced = allocateSmartBudget({ totalBudget, flightPrice, hotelPrice, days, travelerCount: travelers, travelStyle, destination, optional });
  const comfort = allocateSmartBudget({ totalBudget: Math.round(totalBudget * 1.15), flightPrice, hotelPrice: Math.round(hotelPrice * 1.1), days, travelerCount: travelers, travelStyle: "LUXURY", destination, optional });
  return [
    { type: "cheaper", title: "Cheaper plan", budget: cheaper, aiReason: "Lower hotel and discretionary spending; best when budget risk is high." },
    { type: "balanced", title: "Balanced plan", budget: balanced, aiReason: "Uses the selected live flight/hotel and balances food, transport, activities, shopping and emergency." },
    { type: "comfort", title: "Comfort plan", budget: comfort, aiReason: "Adds comfort margin for better hotel/transport and more flexible activities." },
  ];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const totalBudget = Number(body.totalBudget || body.budget || 0);
    const departureAirport = body.departureAirport || null;
    const arrivalAirport = body.arrivalAirport || null;
    const apiMode: "live" | "mock" = "live";
    const destination = String(body.destinationCity || arrivalAirport?.city || body.destination || body.destinationSearchText || "").trim();
    const departure = String(body.departureCity || departureAirport?.city || body.departureSearchText || "").trim();
    const travelerType = String(body.travelerType || "solo");
    const travelStyle = String(body.travelStyle || "moderate");
    const travelerCount = Number(body.travelerCount || 1);
    const currency = String(body.currency || "USD").toUpperCase();
    const departureDate = String(body.departureDate || body.startDate || "");
    const tripType = String(body.tripType || body.flightType || body.ticketType || "ROUND_TRIP").toUpperCase();
    const isOneWay = tripType === "ONE_WAY" || tripType === "ONEWAY" || tripType === "ONE-WAY" || tripType === "SINGLE";
    const returnDate = isOneWay ? "" : String(body.returnDate || body.endDate || "");
    const hotelQuality = String(body.hotelQuality || "");
    const accommodationPreference = String(body.accommodationPreference || "Hotel");
    const transportPreference = String(body.transportPreference || "Mixed taxi + walking");
    const flightCabin = String(body.flightCabin || body.cabinClass || "ECONOMY");
    const flightProvider = normalizeFlightProviderChoice(body.flightProvider || body.flightApiProvider || body.provider || "AUTO");
    const pace = String(body.pace || "MODERATE");
    const notes = String(body.notes || "");
    const interests = Array.isArray(body.interests) ? body.interests.map((x: any) => String(x)).filter(Boolean) : [];
    const from = String(body.departureIata || departureAirport?.iata || "").trim().toUpperCase();
    const to = String(body.arrivalIata || arrivalAirport?.iata || "").trim().toUpperCase();

    if (!destination || !departure) return NextResponse.json({ error: "Departure and destination are required." }, { status: 400 });
    if (apiMode === "live" && (!from || !to)) return NextResponse.json({ error: "Select real departure and arrival airports from the live airport list before generating with live APIs." }, { status: 400 });
    if (!departureDate) return NextResponse.json({ error: "Departure date is required." }, { status: 400 });
    if (!totalBudget || totalBudget < 1) return NextResponse.json({ error: "A total budget is required." }, { status: 400 });

    const optionalBudgets = {
      food: Number(body.foodBudget || 0),
      shopping: Number(body.shoppingBudget || 0),
      transport: Number(body.transportBudget || 0),
      activities: Number(body.activityBudget || 0),
    };

    await refreshExchangeRates();

    const flightResult = await getFlights(departure, destination, departureDate, returnDate, travelerCount, currency, from, to, flightCabin, flightProvider, travelStyle, totalBudget);
    const recommendedFlight = [...(flightResult.flights || [])].sort((a: FlightOption, b: FlightOption) => rankFlight(a) - rankFlight(b))[0] || null;
    let budget = allocateSmartBudget({ totalBudget, flightPrice: Number(recommendedFlight?.price || 0), days: daysBetweenInclusive(departureDate, returnDate || departureDate), travelerCount, travelStyle, travelerType, destination, optional: optionalBudgets });
    const hotelResult = await getHotels(destination, departureDate, returnDate || departureDate, travelerCount, Math.max(1, Math.ceil(travelerCount / 2)), currency, travelStyle, budget.hotels, hotelQuality, accommodationPreference);
    const recommendedHotel = [...(hotelResult.hotels || [])].sort((a: HotelOption, b: HotelOption) => rankHotel(a) - rankHotel(b))[0] || null;
    budget = allocateSmartBudget({ totalBudget, flightPrice: Number(recommendedFlight?.price || 0), hotelPrice: Number(recommendedHotel?.price || 0), days: daysBetweenInclusive(departureDate, returnDate || departureDate), travelerCount, travelStyle, travelerType, destination, optional: optionalBudgets });
    const placesResult = await getPlaces(destination, interests, currency, recommendedHotel?.latitude && recommendedHotel?.longitude ? { latitude: recommendedHotel.latitude, longitude: recommendedHotel.longitude } : arrivalAirport);
    const weatherResult = await getWeather(placesResult.location || (recommendedHotel?.latitude && recommendedHotel?.longitude ? { latitude: recommendedHotel.latitude, longitude: recommendedHotel.longitude } : arrivalAirport), departureDate, returnDate || departureDate);
    const eventsResult = await getEvents(destination, departureDate, returnDate || departureDate, currency);
    const days = Math.max(1, Math.ceil((new Date(returnDate || departureDate).getTime() - new Date(departureDate).getTime()) / 86400000) || 1);
    const recommendations = [
      `AI searched ${isOneWay ? "one-way" : "round-trip"} flights with ${flightProvider === "AUTO" ? "SerpApi #3 → #2 → #1 → SearchApi → Duffel sandbox" : flightProvider} mode and selected the best option by price, stops, duration and cabin.`,
      "Hotels are fetched from the live SearchAPI Google Hotels endpoint with real prices, ratings, images and booking links.",
      budget.aiSummary,
      recommendedFlight?.aiReason || "AI compares live flight options by price, stops, duration and round-trip completeness.",
      recommendedHotel?.aiReason || "AI compares live hotel options by price, rating, hotel quality and budget fit.",
      eventsResult.events?.length ? "AI can place real Eventbrite events into the daily itinerary when they match the trip dates." : "No real event was returned for this trip, so AI does not invent events.",
      flightResult.flights?.length ? "Flight, hotel, place, event, weather and currency data were generated through the live/sandbox API flow." : "No flight provider returned usable results; SmartTravel did not generate fake flight data.",
    ];

    const dailyItinerary = buildItinerarySkeleton({
      days,
      destination,
      departureDate,
      currency,
      interests,
      notes,
      pace,
      transportPreference,
      travelerType,
      budgets: { food: budget.food, shopping: budget.shopping, transport: budget.transport, activities: budget.activities },
      hotel: recommendedHotel,
      places: placesResult.places,
      restaurants: placesResult.restaurants,
      weather: weatherResult.forecast,
      selectedFlight: recommendedFlight,
      events: eventsResult.events,
    });

    return NextResponse.json({
      ok: true,
      source: "SmartTravel live API orchestration",
      apiMode,
      input: body,
      apiStatus: {
        flights: flightResult.status,
        flightProvider,
        hotels: hotelResult.status,
        places: placesResult.status,
        restaurants: placesResult.status,
        weather: weatherResult.status,
        events: eventsResult.status,
        currency: exchangeRateDiagnostics.status,
      },
      apiDiagnostics: {
        flights: flightResult.diagnostics,
        hotels: hotelResult.diagnostics,
        places: placesResult.diagnostics,
        weather: weatherResult.diagnostics,
        events: eventsResult.diagnostics,
        currency: exchangeRateDiagnostics,
      },
      summary: `${departure} (${from}) → ${destination} (${to}), ${travelerCount} traveler(s), ${travelStyle} style, ${currency} ${totalBudget} budget.`,
      budget,
      alternativePlans: buildAlternativePlans(totalBudget, Number(recommendedFlight?.price || 0), Number(recommendedHotel?.price || 0), days, travelerCount, travelStyle, destination, optionalBudgets),
      flightSource: flightResult.source,
      flightProvider,
      flights: flightResult.flights,
      recommendedFlight,
      recommendedFlightId: recommendedFlight?.id || null,
      hotelSource: hotelResult.source,
      hotels: hotelResult.hotels,
      recommendedHotel,
      recommendedHotelId: recommendedHotel?.id || null,
      attractions: placesResult.places.filter((p: PlaceOption) => p.category !== "restaurant"),
      restaurants: placesResult.restaurants,
      places: placesResult.places,
      events: eventsResult.events,
      dailyItinerary,
      days,
      recommendations,
      weather: weatherResult.forecast,
      warnings: [
        ...(flightResult.flights.length ? [] : [`No flight option returned by ${flightProvider === "AUTO" ? "SerpApi #3/#2/#1, SearchApi or Duffel" : flightProvider}. No demo flight was generated.`]),
        ...(hotelResult.hotels.length ? [] : ["No live hotel option returned by SearchAPI Google Hotels. Check SEARCHAPI_KEY, destination and dates."]),
        ...(placesResult.places.length || placesResult.restaurants.length ? [] : ["No live places/restaurants returned by Geoapify. Check GEOAPIFY_API_KEY or destination coordinates."]),
        ...(weatherResult.forecast.length ? [] : ["No weather forecast returned by Open-Meteo for this destination/date range."]),
        ...(eventsResult.status === "api_key_missing" ? ["Eventbrite token is missing."] : []),
        ...(eventsResult.status === "live_no_results" ? ["Eventbrite API was reached, but no public event was returned for this destination/date range."] : []),
        ...(exchangeRateDiagnostics.status === "live" ? [] : ["Currency API did not return live rates; static fallback rates were used."]),
      ],
    });
  } catch (error: any) {
    console.error("SmartTravel live planner error:", error);
    return NextResponse.json({ error: "SmartTravel live planner failed", detail: error?.message || "Unknown error" }, { status: 500 });
  }
}
