"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, Badge } from "@/components/ui";
import { CheckCircle2, ExternalLink, Loader2, Plane, Search, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

type AirportOption = {
  id: string;
  city: string;
  country: string;
  label: string;
  iata: string;
  airport: string;
  terminal?: string;
  kiwiSlug?: string;
  latitude?: number;
  longitude?: number;
  source?: string;
  note?: string;
};

const PROVIDERS = [
  { value: "AUTO", label: "Auto provider" },
  { value: "SERPAPI_3", label: "SerpApi #3" },
  { value: "SERPAPI_2", label: "SerpApi #2" },
  { value: "SERPAPI_1", label: "SerpApi #1" },
  { value: "SEARCHAPI", label: "SearchApi" },
  { value: "DUFFEL", label: "Duffel sandbox" },
];

function airportDisplay(a?: AirportOption | null) {
  if (!a) return "Select live airport result";
  return `${a.city || a.airport}${a.iata ? ` - ${a.iata}` : ""}${a.terminal ? ` - ${a.terminal}` : ""}`;
}

function stopLabel(stops: any) {
  const n = Number(stops);
  if (!Number.isFinite(n)) return "Stops unknown";
  if (n === 0) return "Direct";
  if (n === 1) return "1 stop";
  return `${n} stops`;
}

function flightDuration(flight: any) {
  const minutes = Number(flight?.totalDurationMinutes || flight?.durationMinutes || 0);
  if (!minutes) return flight?.duration || "Duration unknown";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${m ? ` ${m}m` : ""}`;
}

function safeExternalUrl(raw: any, fallback?: string) {
  const value = String(raw || "").trim();
  const candidate = value.startsWith("//") ? `https:${value}` : value.startsWith("/") ? `https://www.google.com${value}` : value;
  try {
    const url = new URL(candidate);
    if (url.hostname.includes("google.") && url.pathname === "/travel/clk/f" && !url.search) return fallback || "";
    if (url.hostname.includes("google.") && url.pathname === "/travel/clk/f" && url.toString().includes("undefined")) return fallback || "";
    if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
  } catch {}
  return fallback || "";
}

function buildFallbackGoogleFlights(input: any, flight?: any) {
  const from = flight?.departureId || flight?.originCode || input?.departureAirport?.iata || "";
  const to = flight?.arrivalId || flight?.destinationCode || input?.arrivalAirport?.iata || "";
  const dep = flight?.outboundDate || input?.departureDate || "";
  const ret = flight?.returnDate || input?.returnDate || "";
  const currency = input?.currency || flight?.currency || "USD";
  const query = `${from} to ${to} ${dep}${ret ? ` return ${ret}` : ""}`.trim();
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(query)}&curr=${encodeURIComponent(currency)}`;
}

function AirportSearchBox({
  title,
  query,
  setQuery,
  selected,
  setSelected,
}: {
  title: string;
  query: string;
  setQuery: (value: string) => void;
  selected: AirportOption | null;
  setSelected: (value: AirportOption | null) => void;
}) {
  const [results, setResults] = useState<AirportOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [diagnostic, setDiagnostic] = useState("");

  useEffect(() => {
    const q = query.trim();
    setSelected(null);
    if (q.length < 2) {
      setResults([]);
      setDiagnostic("Type city, airport name or IATA code.");
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setDiagnostic("");
      try {
        const res = await fetch(`/api/smarttravel/airports?query=${encodeURIComponent(q)}`, { signal: controller.signal, cache: "no-store" });
        const data = await res.json();
        const airports = Array.isArray(data.airports) ? data.airports : [];
        setResults(airports);
        if (!airports.length) setDiagnostic(data?.diagnostics?.message || "No live airport result returned.");
      } catch (error: any) {
        if (error.name !== "AbortError") setDiagnostic(error.message || "Airport search failed.");
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, setSelected]);

  return (
    <div className="rounded-2xl border border-border/80 bg-card/70 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Label>{title}</Label>
        {selected ? <Badge variant="success">Selected</Badge> : <Badge variant="outline">Live</Badge>}
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="h-11 pl-9" placeholder="Baku, GYD, Istanbul, IST..." value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {loading && <div className="rounded-xl border border-border/70 p-3 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Searching airports...</div>}
      {!loading && results.length > 0 && (
        <div className="max-h-60 overflow-auto space-y-2 pr-1">
          {results.map((airport) => {
            const active = selected?.id === airport.id;
            return (
              <button
                key={airport.id}
                type="button"
                onClick={() => setSelected(airport)}
                className={`w-full rounded-xl border p-3 text-left transition-colors ${active ? "border-primary bg-primary/10" : "border-border/80 bg-background/50 hover:bg-muted/30"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{airportDisplay(airport)}</p>
                    <p className="mt-1 text-xs text-muted-foreground truncate">{airport.airport}</p>
                    <p className="text-xs text-muted-foreground truncate">{airport.country || "Country unknown"}</p>
                  </div>
                  {active && <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />}
                </div>
              </button>
            );
          })}
        </div>
      )}
      {!loading && diagnostic && <p className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-2 text-xs text-yellow-700 dark:text-yellow-200">{diagnostic}</p>}
    </div>
  );
}

export default function FlightSearchPage() {
  const [departureQuery, setDepartureQuery] = useState("Baku");
  const [arrivalQuery, setArrivalQuery] = useState("Istanbul");
  const [departureAirport, setDepartureAirport] = useState<AirportOption | null>(null);
  const [arrivalAirport, setArrivalAirport] = useState<AirportOption | null>(null);
  const [form, setForm] = useState({
    tripType: "ROUND_TRIP",
    departureDate: "",
    returnDate: "",
    travelerCount: "1",
    currency: "USD",
    flightCabin: "ECONOMY",
    flightProvider: "AUTO",
  });
  const [loading, setLoading] = useState(false);
  const [openingId, setOpeningId] = useState("");
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    fetch("/api/admin/flight-provider", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.provider) setForm((prev) => ({ ...prev, flightProvider: data.provider }));
      })
      .catch(() => null);
  }, []);

  const flights = useMemo(() => {
    const items = Array.isArray(result?.flights) ? [...result.flights] : [];
    return items.sort((a, b) => Number(a.price || 999999) - Number(b.price || 999999));
  }, [result]);

  const set = (key: string) => (e: any) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const searchFlights = async () => {
    if (!departureAirport || !arrivalAirport) {
      toast.error("Select both airports from the live result list.");
      return;
    }
    if (!form.departureDate) {
      toast.error("Choose a departure date.");
      return;
    }
    if (form.tripType === "ROUND_TRIP" && !form.returnDate) {
      toast.error("Choose a return date or select one-way.");
      return;
    }
    if (form.tripType === "ROUND_TRIP" && new Date(form.returnDate) < new Date(form.departureDate)) {
      toast.error("Return date must be after departure date.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/flights/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, departureAirport, arrivalAirport, departureSearchText: departureQuery, destinationSearchText: arrivalQuery }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Flight search failed");
      setResult(data);
      toast.success(data.flights?.length ? "Flights found" : "No usable flight returned");
    } catch (error: any) {
      toast.error(error.message || "Flight search failed");
    } finally {
      setLoading(false);
    }
  };

  const openOfficialPage = async (flight: any) => {
    const input = result?.input || { departureAirport, arrivalAirport, ...form };
    const fallback = safeExternalUrl(flight?.bookingUrl || flight?.googleFlightsUrl, buildFallbackGoogleFlights(input, flight));
    const bookingToken = flight?.bookingToken || flight?.booking_token || "";
    const departureToken = flight?.departureToken || flight?.departure_token || "";
    const departureId = flight?.departureId || flight?.originCode || departureAirport?.iata || "";
    const arrivalId = flight?.arrivalId || flight?.destinationCode || arrivalAirport?.iata || "";
    const outboundDate = flight?.outboundDate || form.departureDate || "";
    const returnDate = flight?.returnDate || form.returnDate || "";

    if (!bookingToken && !departureToken) {
      if (fallback) window.open(fallback, "_blank", "noopener,noreferrer");
      else toast.error("No official booking link returned for this flight.");
      return;
    }

    try {
      setOpeningId(flight.id || `${flight.airline}-${flight.price}`);
      const res = await fetch("/api/smarttravel/flight-booking-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingToken,
          departureToken,
          providerSource: flight?.source || result?.flightSource || "",
          serpApiSlot: flight?.serpApiSlot || flight?.serpApiProvider || form.flightProvider || "AUTO",
          departureId,
          arrivalId,
          outboundDate,
          returnDate,
          currency: form.currency || "USD",
          fallbackUrl: fallback,
        }),
      });
      const data = await res.json();
      const link = safeExternalUrl(data?.link, fallback);
      if (!res.ok || !link) throw new Error(data?.error || "No official link returned");
      toast.success(data?.provider ? `Opening ${data.provider}` : "Opening flight page");
      window.open(link, "_blank", "noopener,noreferrer");
    } catch (error: any) {
      if (fallback) {
        toast("Opening Google Flights fallback.");
        window.open(fallback, "_blank", "noopener,noreferrer");
      } else {
        toast.error(error.message || "Could not open booking page");
      }
    } finally {
      setOpeningId("");
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Plane className="h-3.5 w-3.5" /> Direct flight search
          </div>
          <h1 className="font-display text-3xl font-bold">Flight Search</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Search tickets without creating a trip. Choose route and dates, then open the official/provider flight page.</p>
        </div>
        <Badge variant="secondary" className="w-fit">No trip is created</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><SlidersHorizontal className="h-4 w-4" /> Route and filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <AirportSearchBox title="Departure city and airport" query={departureQuery} setQuery={setDepartureQuery} selected={departureAirport} setSelected={setDepartureAirport} />
            <AirportSearchBox title="Destination city and airport" query={arrivalQuery} setQuery={setArrivalQuery} selected={arrivalAirport} setSelected={setArrivalAirport} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Ticket type</Label>
              <Select value={form.tripType} onChange={set("tripType")}>
                <option value="ROUND_TRIP">Round trip</option>
                <option value="ONE_WAY">One-way</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Departure date</Label>
              <Input type="date" value={form.departureDate} onChange={set("departureDate")} />
            </div>
            <div className="space-y-2">
              <Label>Return date</Label>
              <Input type="date" value={form.returnDate} onChange={set("returnDate")} disabled={form.tripType === "ONE_WAY"} />
            </div>
            <div className="space-y-2">
              <Label>Travelers</Label>
              <Input type="number" min="1" max="9" value={form.travelerCount} onChange={set("travelerCount")} />
            </div>
            <div className="space-y-2">
              <Label>Cabin</Label>
              <Select value={form.flightCabin} onChange={set("flightCabin")}>
                <option value="ECONOMY">Economy</option>
                <option value="PREMIUM_ECONOMY">Premium economy</option>
                <option value="BUSINESS">Business</option>
                <option value="FIRST">First</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={form.currency} onChange={set("currency")}>
                <option value="USD">USD</option>
                <option value="AZN">AZN</option>
                <option value="TRY">TRY</option>
                <option value="EUR">EUR</option>
              </Select>
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label>Provider</Label>
              <Select value={form.flightProvider} onChange={set("flightProvider")}>
                {PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </Select>
            </div>
          </div>

          <Button onClick={searchFlights} disabled={loading} className="w-full sm:w-auto gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {loading ? "Searching flights..." : "Find flights"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">Flight results</h2>
              <p className="text-sm text-muted-foreground">{flights.length} option(s) from {result.flightSource || "flight provider"}</p>
            </div>
            <Badge variant={flights.length ? "success" : "secondary"}>{flights.length ? "Live results" : "No flights"}</Badge>
          </div>

          {!flights.length && (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">No flight option was returned for this route/date. Try another date, provider or airport.</CardContent></Card>
          )}

          <div className="grid gap-4">
            {flights.map((flight: any, index: number) => {
              const isBest = (flight.id && flight.id === result.recommendedFlightId) || index === 0;
              const id = flight.id || `${flight.airline}-${flight.price}-${index}`;
              return (
                <Card key={id} className={isBest ? "border-primary/50" : ""}>
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold leading-tight">{flight.airline || flight.outbound?.airline || "Flight option"}</h3>
                          {isBest && <Badge variant="success" className="gap-1"><ShieldCheck className="h-3 w-3" /> Best</Badge>}
                          <Badge variant="outline">{flight.cabin || form.flightCabin}</Badge>
                          <Badge variant="secondary">{stopLabel(flight.stops)}</Badge>
                        </div>
                        <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                          <div><span className="block text-xs uppercase tracking-wide">Route</span><span className="font-semibold text-foreground">{flight.route || `${departureAirport?.iata || ""} → ${arrivalAirport?.iata || ""}`}</span></div>
                          <div><span className="block text-xs uppercase tracking-wide">Outbound</span><span className="font-semibold text-foreground">{flight.outbound?.departureTime || flight.departureTime || form.departureDate}</span></div>
                          <div><span className="block text-xs uppercase tracking-wide">Return</span><span className="font-semibold text-foreground">{flight.inbound?.departureTime || flight.returnDate || (form.tripType === "ONE_WAY" ? "One-way" : form.returnDate)}</span></div>
                          <div><span className="block text-xs uppercase tracking-wide">Duration</span><span className="font-semibold text-foreground">{flightDuration(flight)}</span></div>
                        </div>
                        {flight.aiReason && <p className="line-clamp-2 text-sm text-primary">{flight.aiReason}</p>}
                      </div>
                      <div className="flex flex-col gap-3 lg:min-w-[180px] lg:items-end">
                        <div className="text-2xl font-black">{formatCurrency(Number(flight.price || 0), flight.currency || form.currency)}</div>
                        <Button onClick={() => openOfficialPage(flight)} disabled={openingId === id} className="w-full gap-2 lg:w-auto">
                          {openingId === id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                          Open official page
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
