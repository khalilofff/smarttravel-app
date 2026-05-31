"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, Textarea, Badge } from "@/components/ui";
import { Sparkles, Loader2, Plane, Hotel, MapPin, Utensils, Calendar, Menu, ChevronDown, AlertTriangle, SlidersHorizontal, Search, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

const TRAVELER_TYPES = ["SOLO", "COUPLE", "FAMILY", "FRIENDS_GROUP"];
const TRAVEL_STYLES = ["BUDGET", "MODERATE", "LUXURY", "BACKPACKER", "BUSINESS", "ADVENTURE"];
const PACES = ["RELAXED", "MODERATE", "ACTIVE", "PACKED"];
const INTERESTS = ["History", "Culture", "Food", "Nature", "Shopping", "Museums", "Family", "Nightlife", "Events", "Photography", "Beach", "Luxury"];
const FLIGHT_API_PROVIDERS = [
  { value: "AUTO", title: "Auto: SerpApi #3 → #2 → #1 → SearchApi → Duffel", subtitle: "Tries all SerpApi keys first, then SearchApi, then Duffel sandbox. Demo fallback is disabled.", badge: "Safe" },
  { value: "SERPAPI_3", title: "SerpApi #3 Google Flights", subtitle: "Newest 250-limit SerpApi key. Tries only this key when selected.", badge: "Live" },
  { value: "SERPAPI_2", title: "SerpApi #2 Google Flights", subtitle: "Second SerpApi key / backup quota.", badge: "Live" },
  { value: "SERPAPI_1", title: "SerpApi #1 Google Flights", subtitle: "Original SerpApi key / old quota.", badge: "Live" },
  { value: "SEARCHAPI", title: "SearchApi Google Flights", subtitle: "Extra live Google Flights provider with prices, booking token and booking options", badge: "Live" },
  { value: "DUFFEL", title: "Duffel Sandbox", subtitle: "Test flight offers only; no live order creation. Saved only as a planning option; no booking is created.", badge: "Sandbox" },
];

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

function safeDateDays(start: string, end: string) {
  if (!start || !end) return 1;
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.ceil(diff / 86400000) + 1);
}

function airportDisplay(a?: AirportOption | null) {
  if (!a) return "Select from live airport results";
  return `${a.city || a.airport}${a.iata ? ` - ${a.iata}` : ""}${a.terminal ? ` - ${a.terminal}` : ""}`;
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
  const [diagnostic, setDiagnostic] = useState<string>("");

  useEffect(() => {
    const q = query.trim();
    setSelected(null);
    if (q.length < 2) {
      setResults([]);
      setDiagnostic("Type city or airport name, then select a real live result.");
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setDiagnostic("");
      try {
        const res = await fetch(`/api/smarttravel/airports?query=${encodeURIComponent(q)}`, { signal: controller.signal });
        const data = await res.json();
        setResults(Array.isArray(data.airports) ? data.airports : []);
        if (!data.airports?.length) {
          setDiagnostic(data.diagnostics?.message || data.diagnostics?.primary?.error || "No live airport result returned. No mock airport was generated.");
        }
      } catch (error: any) {
        if (error.name !== "AbortError") setDiagnostic(error.message || "Live airport search failed.");
      } finally {
        setLoading(false);
      }
    }, 450);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, setSelected]);

  return (
    <div className="rounded-2xl border p-5 space-y-4 bg-card/60">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-base">{title}</Label>
        {selected ? <Badge variant="success">Live selected</Badge> : <Badge variant="outline">Live search</Badge>}
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="h-12 pl-9" placeholder="Example: Baku, GYD, Istanbul, IST, Sabiha..." value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {loading && <div className="rounded-xl border p-4 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Searching live airport API...</div>}
      {!loading && results.length > 0 && (
        <div className="space-y-2 max-h-80 overflow-auto pr-1">
          {results.map((airport) => {
            const active = selected?.id === airport.id;
            return (
              <button
                type="button"
                key={airport.id}
                onClick={() => setSelected(airport)}
                className={`w-full text-left rounded-2xl border p-4 transition-colors ${active ? "border-primary bg-primary/10" : "bg-muted/20 hover:bg-muted/40"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{airportDisplay(airport)}</p>
                    <p className="text-sm text-muted-foreground mt-1">{airport.airport}</p>
                    <p className="text-sm text-muted-foreground">{airport.country || "Country not returned"} {airport.latitude && airport.longitude ? `• ${airport.latitude}, ${airport.longitude}` : ""}</p>
                    <p className="text-xs text-muted-foreground mt-2">{airport.note || "Live airport result from API."}</p>
                  </div>
                  {active && <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />}
                </div>
              </button>
            );
          })}
        </div>
      )}
      {!loading && diagnostic && <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-3 text-sm text-yellow-700 dark:text-yellow-200">{diagnostic}</div>}
    </div>
  );
}

export default function PlannerPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const canChooseFlightProvider = session?.user?.role === "SUPER_ADMIN" || session?.user?.role === "MANAGER";
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [departureQuery, setDepartureQuery] = useState("Baku");
  const [arrivalQuery, setArrivalQuery] = useState("Istanbul");
  const [departureAirport, setDepartureAirport] = useState<AirportOption | null>(null);
  const [arrivalAirport, setArrivalAirport] = useState<AirportOption | null>(null);
  const [form, setForm] = useState({
    tripType: "ROUND_TRIP",
    departureDate: "",
    returnDate: "",
    travelerCount: "1",
    travelerType: "SOLO",
    travelStyle: "MODERATE",
    totalBudget: "2000",
    currency: "USD",
    foodBudget: "",
    shoppingBudget: "",
    transportBudget: "",
    activityBudget: "",
    accommodationPreference: "Hotel",
    hotelQuality: "3-4 star",
    pace: "MODERATE",
    transportPreference: "Mixed taxi + walking",
    weatherPreference: "Balanced indoor/outdoor",
    flightCabin: "ECONOMY",
    flightProvider: "AUTO",
    notes: "",
  });
  const [interests, setInterests] = useState<string[]>(["Culture", "Food"]);
  const [generating, setGenerating] = useState(false);
  const [generationMode, setGenerationMode] = useState<"live">("live");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selectedFlightId, setSelectedFlightId] = useState<string>("");
  const [selectedHotelId, setSelectedHotelId] = useState<string>("");
  const [flightSort, setFlightSort] = useState("AI_BEST");
  const [directOnly, setDirectOnly] = useState(false);
  const [maxStops, setMaxStops] = useState("ANY");
  const [maxFlightBudget, setMaxFlightBudget] = useState("");
  const [airlineFilter, setAirlineFilter] = useState("ALL");
  const [departureTimeFilter, setDepartureTimeFilter] = useState("ANY");

  const [draftFlightSort, setDraftFlightSort] = useState("AI_BEST");
  const [draftDirectOnly, setDraftDirectOnly] = useState(false);
  const [draftMaxStops, setDraftMaxStops] = useState("ANY");
  const [draftMaxFlightBudget, setDraftMaxFlightBudget] = useState("");
  const [draftAirlineFilter, setDraftAirlineFilter] = useState("ALL");
  const [draftDepartureTimeFilter, setDraftDepartureTimeFilter] = useState("ANY");

  useEffect(() => {
    if (!result) {
      setSelectedFlightId("");
      setSelectedHotelId("");
      return;
    }
    setSelectedFlightId(result.recommendedFlightId || result.flights?.[0]?.id || "");
    setSelectedHotelId(result.recommendedHotelId || result.hotels?.[0]?.id || "");
  }, [result]);

  const days = safeDateDays(form.departureDate, form.tripType === "ROUND_TRIP" ? form.returnDate : form.departureDate);
  const set = (key: string) => (e: any) => setForm(prev => ({ ...prev, [key]: e.target.value }));
  const toggleInterest = (item: string) => setInterests(prev => prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]);

  const payload = (apiMode: "live" = generationMode) => ({
    ...form,
    departureCity: departureAirport?.city,
    destinationCity: arrivalAirport?.city,
    departureAirport,
    arrivalAirport,
    departureIata: departureAirport?.iata,
    arrivalIata: arrivalAirport?.iata,
    departureKiwiSlug: departureAirport?.kiwiSlug,
    arrivalKiwiSlug: arrivalAirport?.kiwiSlug,
    travelerCount: Number(form.travelerCount || 1),
    totalBudget: Number(form.totalBudget || 0),
    foodBudget: Number(form.foodBudget || 0),
    shoppingBudget: Number(form.shoppingBudget || 0),
    transportBudget: Number(form.transportBudget || 0),
    activityBudget: Number(form.activityBudget || 0),
    interests,
    apiMode,
    departureSearchText: departureQuery,
    destinationSearchText: arrivalQuery,
  });

  const selectedFlight = result?.flights?.find((f: any) => f.id === selectedFlightId) || result?.recommendedFlight || null;
  const selectedHotel = result?.hotels?.find((h: any) => h.id === selectedHotelId) || result?.recommendedHotel || null;

  const filterAndSortFlights = (settings: {
    sort: string;
    direct: boolean;
    stops: string;
    budget: string;
    airline: string;
    departureTime: string;
  }) => {
    let flights = Array.isArray(result?.flights) ? [...result.flights] : [];
    const maxBudget = Number(settings.budget || 0);
    flights = flights.filter((flight: any) => {
      const stops = Number.isFinite(Number(flight.stops)) ? Number(flight.stops) : 99;
      const price = Number(flight.price || 0);
      if (settings.direct && stops !== 0) return false;
      if (settings.stops !== "ANY" && stops > Number(settings.stops)) return false;
      if (maxBudget > 0 && price > maxBudget) return false;
      const airlineText = [flight.airline, flight.outbound?.airline, flight.inbound?.airline].filter(Boolean).join(" ").toLowerCase();
      if (settings.airline !== "ALL" && !airlineText.includes(settings.airline.toLowerCase())) return false;
      const hour = getDepartureHour(flight);
      if (settings.departureTime === "MORNING" && (hour === null || hour < 5 || hour >= 12)) return false;
      if (settings.departureTime === "AFTERNOON" && (hour === null || hour < 12 || hour >= 18)) return false;
      if (settings.departureTime === "EVENING" && (hour === null || hour < 18 || hour >= 24)) return false;
      if (settings.departureTime === "NIGHT" && (hour === null || (hour >= 5 && hour < 24))) return false;
      return true;
    });
    const uniq = new Map<string, any>();
    flights.forEach((flight: any) => {
      const key = [flight.airline, flight.outbound?.departureTime || flight.departureTime, flight.inbound?.departureTime || "", flight.price, flight.stops].join("|");
      if (!uniq.has(key)) uniq.set(key, flight);
    });
    flights = Array.from(uniq.values());
    flights.sort((a: any, b: any) => {
      if (settings.sort === "CHEAPEST") return Number(a.price || 999999) - Number(b.price || 999999);
      if (settings.sort === "FASTEST") return Number(a.totalDurationMinutes || a.durationMinutes || 9999) - Number(b.totalDurationMinutes || b.durationMinutes || 9999);
      if (settings.sort === "FEWEST_STOPS") return Number(a.stops ?? 99) - Number(b.stops ?? 99) || Number(a.price || 999999) - Number(b.price || 999999);
      return flightScore(a) - flightScore(b);
    });
    return flights;
  };

  const applyFlightFilters = () => {
    const nextSettings = {
      sort: draftFlightSort,
      direct: draftDirectOnly,
      stops: draftMaxStops,
      budget: draftMaxFlightBudget,
      airline: draftAirlineFilter,
      departureTime: draftDepartureTimeFilter,
    };
    const nextFlights = filterAndSortFlights(nextSettings);
    setFlightSort(draftFlightSort);
    setDirectOnly(draftDirectOnly);
    setMaxStops(draftMaxStops);
    setMaxFlightBudget(draftMaxFlightBudget);
    setAirlineFilter(draftAirlineFilter);
    setDepartureTimeFilter(draftDepartureTimeFilter);
    if (nextFlights.length && !nextFlights.some((f: any) => f.id === selectedFlightId)) {
      setSelectedFlightId(nextFlights[0].id);
      toast.success("Filters applied. First matching flight selected.");
    } else {
      toast.success(nextFlights.length ? "Filters applied" : "Filters applied: no matching flights");
    }
  };

  const resetFlightFilters = () => {
    setDraftFlightSort("AI_BEST");
    setDraftDirectOnly(false);
    setDraftMaxStops("ANY");
    setDraftMaxFlightBudget("");
    setDraftAirlineFilter("ALL");
    setDraftDepartureTimeFilter("ANY");
    setFlightSort("AI_BEST");
    setDirectOnly(false);
    setMaxStops("ANY");
    setMaxFlightBudget("");
    setAirlineFilter("ALL");
    setDepartureTimeFilter("ANY");
    setSelectedFlightId(result?.recommendedFlightId || result?.flights?.[0]?.id || "");
    toast.success("Flight filters reset");
  };


  const buildAiBudgetForSelection = () => {
    if (!result) return {} as any;
    const total = Math.max(0, Math.round(Number(form.totalBudget || 0)));
    const flights = Math.max(0, Math.round(Number(selectedFlight?.price ?? result.budget?.flights ?? 0)));
    const hotels = Math.max(0, Math.round(Number(selectedHotel?.price ?? result.budget?.hotels ?? 0)));
    const style = String(form.travelStyle || "MODERATE").toUpperCase();
    const travelerType = String(form.travelerType || "SOLO").toUpperCase();
    const destination = String(arrivalAirport?.city || result?.input?.destinationCity || arrivalQuery || "").toLowerCase();
    const cityCost = destination.includes("paris") || destination.includes("london") || destination.includes("dubai") ? 1.25 : destination.includes("istanbul") || destination.includes("baku") ? 0.95 : 1;
    const travelers = Math.max(1, Number(form.travelerCount || 1));
    const tripDays = Math.max(1, days);
    let pool = Math.max(0, total - flights - hotels);
    const out: Record<string, number | string> = { flights, hotels, food: 0, transport: 0, shopping: 0, activities: 0, emergency: 0, remaining: 0, overBudget: Math.max(0, flights + hotels - total) };
    const requested: Record<string, number> = {
      food: Math.max(0, Math.round(Number(form.foodBudget || 0))),
      shopping: Math.max(0, Math.round(Number(form.shoppingBudget || 0))),
      transport: Math.max(0, Math.round(Number(form.transportBudget || 0))),
      activities: Math.max(0, Math.round(Number(form.activityBudget || 0))),
    };
    for (const key of ["food", "shopping", "transport", "activities"]) {
      if (requested[key] > 0) {
        const value = Math.min(pool, requested[key]);
        out[key] = value;
        pool -= value;
      }
    }
    const dailyFood = style === "LUXURY" || style === "BUSINESS" ? 70 : style === "BUDGET" || style === "BACKPACKER" ? 28 : 45;
    const dailyActivities = style === "ADVENTURE" ? 38 : style === "LUXURY" ? 50 : style === "BUDGET" ? 18 : 28;
    const dailyTransport = travelerType === "FAMILY" ? 24 : style === "BUSINESS" ? 35 : style === "BUDGET" ? 12 : 18;
    const minimums: Record<string, number> = {
      food: Math.round(dailyFood * tripDays * travelers * cityCost),
      transport: Math.round(dailyTransport * tripDays * Math.max(1, Math.ceil(travelers / 2)) * cityCost),
      activities: Math.round(dailyActivities * tripDays * travelers * cityCost),
      shopping: Math.round((style === "LUXURY" ? 45 : style === "BUDGET" || style === "BACKPACKER" ? 8 : 22) * tripDays * cityCost),
    };
    for (const key of ["food", "transport", "activities", "shopping"]) {
      if (Number(out[key] || 0) > 0) continue;
      const value = Math.min(pool, minimums[key]);
      out[key] = value;
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
    const adjustable = ["food", "transport", "activities", "shopping", "emergency"];
    const weightTotal = adjustable.reduce((sum, key) => sum + (profile[key] || 0), 0) || 1;
    for (const key of adjustable) out[key] = Number(out[key] || 0) + Math.round(pool * ((profile[key] || 0) / weightTotal));
    const used = Number(out.flights) + Number(out.hotels) + Number(out.food) + Number(out.transport) + Number(out.shopping) + Number(out.activities) + Number(out.emergency);
    out.emergency = Math.max(0, Number(out.emergency) + (total - used));
    const minimumTotal = minimums.food + minimums.transport + minimums.activities + minimums.shopping;
    const gap = Math.max(0, flights + hotels + minimumTotal - total);
    out.affordabilityGap = gap;
    out.confidence = gap > 0 ? "LOW" : Number(out.emergency) < total * 0.05 ? "MEDIUM" : "HIGH";
    out.aiSummary = gap > 0
      ? `Budget risk: live flight + hotel + minimum daily costs exceed the budget by about ${formatCurrency(gap, form.currency)}.`
      : `AI divided money using selected flight, selected hotel, ${tripDays} day(s), ${travelers} traveler(s), style and destination cost.`;
    return out;
  };


  const displayBudget = result ? buildAiBudgetForSelection() : {};
  const travelerCountNumber = Math.max(1, Number(form.travelerCount || 1));

  const flightScore = (flight: any) => {
    const price = Number(flight?.price || 999999);
    const stops = Number.isFinite(Number(flight?.stops)) ? Number(flight.stops) : 99;
    const duration = Number(flight?.totalDurationMinutes || flight?.durationMinutes || 9999);
    const hasReturn = form.tripType === "ROUND_TRIP" && !flight?.isRoundTrip ? 5000 : 0;
    const style = String(form.travelStyle || "MODERATE").toUpperCase();
    const travelerType = String(form.travelerType || "SOLO").toUpperCase();
    if (travelerType === "FAMILY") return stops * 1500 + duration * 2 + price * 0.35 + hasReturn;
    if (style === "LUXURY" || style === "BUSINESS") return duration * 3 + stops * 900 + price * 0.25 + hasReturn;
    if (style === "BUDGET" || style === "BACKPACKER") return price * 1.15 + stops * 500 + duration * 0.8 + hasReturn;
    return price * 0.75 + stops * 800 + duration * 1.2 + hasReturn;
  };

  const getDepartureHour = (flight: any) => {
    const time = String(flight?.outbound?.departureTime || flight?.departureTime || "").trim();
    const iso = time.match(/(?:T|\s)(\d{1,2}):(\d{2})/);
    if (iso) return Number(iso[1]);
    const ampm = time.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
    if (ampm) {
      let h = Number(ampm[1]);
      const meridiem = ampm[3].toUpperCase();
      if (meridiem === "PM" && h < 12) h += 12;
      if (meridiem === "AM" && h === 12) h = 0;
      return h;
    }
    const simple = time.match(/^(\d{1,2}):(\d{2})/);
    return simple ? Number(simple[1]) : null;
  };

  const availableAirlines = useMemo(() => {
    const names = new Set<string>();
    (result?.flights || []).forEach((flight: any) => {
      String(flight.airline || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
        .forEach((x) => names.add(x));
    });
    return Array.from(names).sort();
  }, [result]);

  const filteredFlights = useMemo(() => filterAndSortFlights({
    sort: flightSort,
    direct: directOnly,
    stops: maxStops,
    budget: maxFlightBudget,
    airline: airlineFilter,
    departureTime: departureTimeFilter,
  }), [result, directOnly, maxStops, maxFlightBudget, airlineFilter, departureTimeFilter, flightSort, form.travelStyle, form.travelerType, selectedFlightId]);

  const generate = async (apiMode: "live" = "live") => {
    setGenerationMode(apiMode);
    if (apiMode === "live" && (!departureAirport || !arrivalAirport)) {
      toast.error("Select real departure and destination airports from the live API list before live API generation");
      return;
    }
    if (!form.departureDate) {
      toast.error("Fill departure date");
      return;
    }
    if (form.tripType === "ROUND_TRIP" && !form.returnDate) {
      toast.error("Fill return date or choose one-way trip");
      return;
    }
    if (form.tripType === "ROUND_TRIP" && new Date(form.returnDate) < new Date(form.departureDate)) {
      toast.error("Return date must be after departure date");
      return;
    }
    if (!Number(form.totalBudget || 0)) {
      toast.error("Total budget is required");
      return;
    }
    setGenerating(true);
    setResult(null);
    try {
      const res = await fetch("/api/smarttravel/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload(apiMode)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detail || "Could not generate plan");
      setResult(data);
      toast.success("Live API plan generated");
    } catch (error: any) {
      toast.error(error.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const saveTrip = async () => {
    if (!result) return;
    const destCity = String(arrivalAirport?.city || result?.input?.destinationCity || arrivalQuery || selectedHotel?.city || "Destination").trim() || "Destination";
    const depCity = String(departureAirport?.city || result?.input?.departureCity || departureQuery || "Departure").trim() || "Departure";
    const destinationLat = Number(arrivalAirport?.latitude ?? selectedHotel?.latitude ?? result?.apiDiagnostics?.places?.location?.latitude ?? 0);
    const destinationLng = Number(arrivalAirport?.longitude ?? selectedHotel?.longitude ?? result?.apiDiagnostics?.places?.location?.longitude ?? 0);
    const safeNotes = {
      plannerVersion: "smarttravel-live-v2",
      mode: result.apiMode || generationMode,
      preferences: {
        departure: depCity,
        destination: destCity,
        travelerType: form.travelerType,
        travelStyle: form.travelStyle,
        pace: form.pace,
        transportPreference: form.transportPreference,
        hotelQuality: form.hotelQuality,
        accommodationPreference: form.accommodationPreference,
        tripType: form.tripType,
        flightCabin: form.flightCabin,
        flightProvider: form.flightProvider,
        interests,
        userNotes: form.notes,
      },
      aiBudget: displayBudget,
      selectedFlightId,
      selectedHotelId,
      selectedFlightSummary: selectedFlight ? {
        id: selectedFlight.id, airline: selectedFlight.airline, route: selectedFlight.route, price: selectedFlight.price, currency: selectedFlight.currency,
      } : null,
      selectedHotelSummary: selectedHotel ? {
        id: selectedHotel.id || selectedHotel.hotelId, name: selectedHotel.name, city: selectedHotel.city, price: selectedHotel.price, currency: selectedHotel.currency, rating: selectedHotel.rating,
      } : null,
      recommendations: (result.recommendations || []).slice(0, 8),
      savedCounts: { places: result.places?.length || 0, restaurants: result.restaurants?.length || 0, weather: result.weather?.length || 0, days: result.dailyItinerary?.length || 0 },
    };
    setSaving(true);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${destCity} AI Plan`.slice(0, 100),
          description: `${String(form.travelStyle || "MODERATE").toLowerCase()} ${String(form.travelerType || "SOLO").toLowerCase()} trip from ${depCity} to ${destCity}`.slice(0, 1000),
          startDate: form.departureDate,
          endDate: form.tripType === "ROUND_TRIP" ? form.returnDate : form.departureDate,
          totalBudget: Math.max(0, Math.min(100000, Number(form.totalBudget) || 0)),
          currency: form.currency || "USD",
          travelerCount: Math.max(1, Math.min(50, Number(form.travelerCount) || 1)),
          travelStyle: form.travelStyle || "MODERATE",
          notes: JSON.stringify(safeNotes),
          aiBudget: displayBudget,
          selectedFlight,
          selectedHotel,
          dailyItinerary: result.dailyItinerary || [],
          places: result.places || [],
          restaurants: result.restaurants || [],
          weather: result.weather || [],
          destinations: [{
            name: destCity,
            country: String(arrivalAirport?.country || selectedHotel?.country || "Unknown").trim() || "Unknown",
            latitude: Number.isFinite(destinationLat) ? destinationLat : 0,
            longitude: Number.isFinite(destinationLng) ? destinationLng : 0,
          }],
        }),
      });
      const trip = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(trip.error || trip.message || "Could not save trip");
      toast.success("Trip saved to My Trips");
      router.push(`/trip/${trip.id}`);
    } catch (error: any) {
      toast.error(error.message || "Could not save trip");
    } finally {
      setSaving(false);
    }
  };



  const openHotelBooking = (hotel: any) => {
    if (!hotel) return;
    if (hotel.bookingUrl) {
      window.open(hotel.bookingUrl, "_blank", "noopener,noreferrer");
      return;
    }
    const city = encodeURIComponent(hotel.city || arrivalAirport?.city || "");
    const name = encodeURIComponent(hotel.name || "hotel");
    const checkin = encodeURIComponent(hotel.checkIn || form.departureDate || "");
    const checkout = encodeURIComponent(hotel.checkOut || form.returnDate || "");
    window.open(`https://www.booking.com/searchresults.html?ss=${city}&checkin=${checkin}&checkout=${checkout}&group_adults=${form.travelerCount || 1}&no_rooms=1&selected_currency=${form.currency || "USD"}&label=smarttravel&aid=304142&lang=en-us&highlighted_hotels=${encodeURIComponent(hotel.hotelId || "")}&si=ai%2Cco%2Cci%2Cre%2Cla%2Cdi&ssne=${city}&ssne_untouched=${city}&query=${name}`, "_blank", "noopener,noreferrer");
  };


  const safeExternalUrl = (raw: any, fallback?: string) => {
    const value = String(raw || "").trim();
    const candidate = value.startsWith("//") ? `https:${value}` : value.startsWith("/") ? `https://www.google.com${value}` : value;
    try {
      const url = new URL(candidate);
      if (url.hostname.includes("google.") && url.pathname === "/travel/clk/f" && !url.search) return fallback || "";
      if (url.hostname.includes("google.") && url.pathname === "/travel/clk/f" && url.toString().includes("undefined")) return fallback || "";
      if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
    } catch {}
    return fallback || "";
  };

  const openFlightBooking = async (flight: any) => {
    if (!flight) return;
    const bookingToken = flight.bookingToken || flight.booking_token || "";
    const departureToken = flight.departureToken || flight.departure_token || "";
    const departureId = flight.departureId || flight.originCode || departureAirport?.iata || "";
    const arrivalId = flight.arrivalId || flight.destinationCode || arrivalAirport?.iata || "";
    const outboundDate = flight.outboundDate || form.departureDate || "";
    const returnDate = flight.returnDate || form.returnDate || "";
    const token = bookingToken || departureToken;

    if (!token && flight.bookingUrl) {
      const safeUrl = safeExternalUrl(flight.bookingUrl, flight.googleFlightsUrl || "");
      if (safeUrl) {
        window.open(safeUrl, "_blank", "noopener,noreferrer");
        return;
      }
    }
    if (!token) {
      toast.error("This flight did not return a booking/departure token. Try another flight option.");
      return;
    }
    if (!departureId || !arrivalId || !outboundDate) {
      toast.error("Missing route/date data for booking options. Regenerate flights and try again.");
      return;
    }
    try {
      toast.loading("Opening exact flight booking options...", { id: "booking-options" });
      const res = await fetch("/api/smarttravel/flight-booking-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingToken,
          departureToken,
          providerSource: flight.source || result?.flightSource || "",
          serpApiSlot: flight.serpApiSlot || flight.serpApiProvider || "",
          departureId,
          arrivalId,
          outboundDate,
          returnDate,
          currency: form.currency || "USD",
          flightId: flight.id,
          fallbackUrl: flight.bookingUrl || flight.googleFlightsUrl || "",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.link) throw new Error(data.error || "No booking link returned");
      const safeLink = safeExternalUrl(data.link, flight.bookingUrl || flight.googleFlightsUrl || "");
      if (!safeLink) throw new Error("Booking provider returned an invalid link");
      toast.success(data.provider ? `Opening ${data.provider}` : "Opening flight booking options", { id: "booking-options" });
      window.open(safeLink, "_blank", "noopener,noreferrer");
    } catch (error: any) {
      toast.error(error.message || "Could not open booking page", { id: "booking-options" });
    }
  };


  const mapsSearchUrl = (name: any, address?: any, city?: any) => {
    const q = [name, address, city || arrivalAirport?.city || result?.input?.destinationCity || arrivalQuery].filter(Boolean).join(' ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q || 'restaurant')}`;
  };

  const safeOpenExternal = (raw: any, fallback: string) => {
    const link = safeExternalUrl(raw, fallback);
    if (link) window.open(link, '_blank', 'noopener,noreferrer');
  };

  const openPlaceOrRestaurant = (item: any) => {
    if (!item) return;
    safeOpenExternal(item.website || item.url || item.link, mapsSearchUrl(item.name, item.address, item.city));
  };

  const openEvent = (event: any) => {
    if (!event) return;
    const fallback = `https://www.google.com/search?q=${encodeURIComponent([event.name, event.venue, event.city, 'event tickets'].filter(Boolean).join(' '))}`;
    safeOpenExternal(event.url || event.link, fallback);
  };

  const ApiStatus = ({ label, value }: { label: string; value?: string }) => {
    const status = String(value || "not called").toLowerCase();
    const okStatuses = new Set(["live", "live_backup", "success", "ok"]);
    const warningStatuses = new Set(["mock_fallback", "flight_mock_only", "live_extended_dates", "live_guidance", "live_no_results", "empty", "not called", "warning"]);
    const errorStatuses = new Set(["api_key_missing", "invalid_key", "failed", "error", "api_error", "http_error", "mock_test"]);
    const variant = okStatuses.has(status)
      ? "success"
      : errorStatuses.has(status)
        ? "destructive"
        : warningStatuses.has(status) || status.includes("no_results") || status.includes("empty") || status.includes("missing")
          ? "warning"
          : "secondary";
    return <Badge variant={variant as any}>{label}: {value || "not called"}</Badge>;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><Sparkles className="h-7 w-7 text-primary" /> AI Trip Planner</h1>
        
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="cursor-pointer" onClick={() => setFiltersOpen(!filtersOpen)}>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2"><Menu className="h-5 w-5" /> Trip route, live airport search and filters</CardTitle>
            <ChevronDown className={`h-5 w-5 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
          </div>
        </CardHeader>
        {filtersOpen && (
          <CardContent className="space-y-6">
            <div className="grid xl:grid-cols-2 gap-5">
              <AirportSearchBox title="Departure city and airport" query={departureQuery} setQuery={setDepartureQuery} selected={departureAirport} setSelected={setDepartureAirport} />
              <AirportSearchBox title="Destination city and airport" query={arrivalQuery} setQuery={setArrivalQuery} selected={arrivalAirport} setSelected={setArrivalAirport} />
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-6 gap-4">
              <div><Label>Ticket type</Label><Select value={form.tripType} onChange={(e: any) => setForm(prev => ({ ...prev, tripType: e.target.value, returnDate: e.target.value === "ONE_WAY" ? "" : prev.returnDate }))} className="mt-1 h-12"><option value="ROUND_TRIP">Round trip</option><option value="ONE_WAY">One way</option></Select></div>
              <div><Label>Departure date</Label><Input type="date" value={form.departureDate} onChange={set("departureDate")} className="mt-1 h-12" /></div>
              <div><Label>{form.tripType === "ROUND_TRIP" ? "Return date" : "Return date disabled"}</Label><Input type="date" value={form.returnDate} onChange={set("returnDate")} disabled={form.tripType === "ONE_WAY"} className="mt-1 h-12" /></div>
              <div><Label>Travelers</Label><Input type="number" min="1" value={form.travelerCount} onChange={set("travelerCount")} className="mt-1 h-12" /></div>
              <div><Label>Currency</Label><Select value={form.currency} onChange={set("currency")} className="mt-1 h-12"><option>USD</option><option>EUR</option><option>TRY</option><option>AZN</option></Select></div>
              <div><Label>Flight cabin</Label><Select value={form.flightCabin} onChange={set("flightCabin")} className="mt-1 h-12"><option value="ECONOMY">Economy</option><option value="PREMIUM_ECONOMY">Premium Economy</option><option value="BUSINESS">Business</option><option value="FIRST">First Class</option></Select></div>
            </div>

            {canChooseFlightProvider && (
              <div className="rounded-2xl border p-4 space-y-3 bg-muted/10">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Label className="text-base">Advanced Flight API Settings</Label>
                    <p className="text-xs text-muted-foreground mt-1">Visible only to Manager and Super Admin. Regular users use the default Auto mode in the background.</p>
                  </div>
                  <Badge variant="outline">Current: {FLIGHT_API_PROVIDERS.find(p => p.value === form.flightProvider)?.title || form.flightProvider}</Badge>
                </div>
                <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-3">
                  {FLIGHT_API_PROVIDERS.map((provider) => {
                    const active = form.flightProvider === provider.value;
                    return (
                      <button
                        key={provider.value}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, flightProvider: provider.value }))}
                        className={`text-left rounded-2xl border p-4 transition-colors ${active ? "border-primary bg-primary/10 shadow-sm" : "bg-card hover:bg-muted/40"}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold leading-tight">{provider.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">{provider.subtitle}</p>
                          </div>
                          <Badge variant={active ? ("success" as any) : "outline"}>{provider.badge}</Badge>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div><Label>Traveler type</Label><Select value={form.travelerType} onChange={set("travelerType")} className="mt-1 h-12">{TRAVELER_TYPES.map(x => <option key={x} value={x}>{x.replace("_", " ")}</option>)}</Select></div>
              <div><Label>Travel style</Label><Select value={form.travelStyle} onChange={set("travelStyle")} className="mt-1 h-12">{TRAVEL_STYLES.map(x => <option key={x} value={x}>{x}</option>)}</Select></div>
              <div><Label>Pace</Label><Select value={form.pace} onChange={set("pace")} className="mt-1 h-12">{PACES.map(x => <option key={x} value={x}>{x}</option>)}</Select></div>
              <div><Label>Total budget</Label><Input type="number" value={form.totalBudget} onChange={set("totalBudget")} className="mt-1 h-12" /></div>
            </div>

            <div className="rounded-2xl border p-4 space-y-4">
              <div className="flex items-center gap-2 font-semibold"><SlidersHorizontal className="h-4 w-4" /> AI budget planning controls</div>
              <p className="text-xs text-muted-foreground">Leave these empty and SmartTravel will divide the money automatically using flights, hotel, trip length, travel style and traveler type. Fill any field only when you want to override that part.</p>
              <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
                <Input type="number" placeholder="Food override (optional)" value={form.foodBudget} onChange={set("foodBudget")} />
                <Input type="number" placeholder="Shopping override (optional)" value={form.shoppingBudget} onChange={set("shoppingBudget")} />
                <Input type="number" placeholder="Transport override (optional)" value={form.transportBudget} onChange={set("transportBudget")} />
                <Input type="number" placeholder="Activity override (optional)" value={form.activityBudget} onChange={set("activityBudget")} />
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Accommodation type</Label>
                  <Select value={form.accommodationPreference} onChange={set("accommodationPreference")} className="mt-1 h-12">
                    <option value="Hotel">Hotel</option>
                    <option value="Vacation rental">Vacation rental / apartment</option>
                    <option value="Resort">Resort</option>
                  </Select>
                </div>
                <div>
                  <Label>Hotel quality</Label>
                  <Select value={form.hotelQuality} onChange={set("hotelQuality")} className="mt-1 h-12">
                    <option value="Any">Any star rating</option>
                    <option value="3 star">3 star</option>
                    <option value="4 star">4 star</option>
                    <option value="3-4 star">3-4 star</option>
                    <option value="5 star">5 star</option>
                  </Select>
                </div>
                <div>
                  <Label>Transport preference</Label>
                  <Select value={form.transportPreference} onChange={set("transportPreference")} className="mt-1 h-12">
                    <option value="Mixed taxi + walking">Mixed taxi + walking</option>
                    <option value="Public transport focused">Public transport focused</option>
                    <option value="Taxi only">Taxi only</option>
                    <option value="Walking friendly">Walking friendly</option>
                    <option value="Rental car">Rental car</option>
                  </Select>
                </div>
              </div>
            </div>

            <div>
              <Label>Interests</Label>
              <div className="flex flex-wrap gap-2 mt-2">{INTERESTS.map(i => <button type="button" key={i} onClick={() => toggleInterest(i)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${interests.includes(i) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{i}</button>)}</div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={set("notes")} placeholder="Example: avoid long walking, include shopping malls, child-friendly places..." className="mt-1 min-h-24" /></div>
            <Button type="button" onClick={() => generate("live")} loading={generating} size="lg" className="w-full gap-2"><Sparkles className="h-4 w-4" /> AI plan trip with live APIs</Button>
          </CardContent>
        )}
      </Card>

      {!result && !generating && (
        <Card><CardContent className="p-10 text-center"><Sparkles className="h-10 w-10 text-primary mx-auto mb-3" /><h3 className="font-semibold text-lg">Ready to generate</h3></CardContent></Card>
      )}
      {generating && (
        <Card><CardContent className="p-12 text-center"><Loader2 className="h-9 w-9 animate-spin text-primary mx-auto mb-3" /><h3 className="font-semibold">{"Calling live APIs and building AI plan..."}</h3></CardContent></Card>
      )}
      {result && (
        <div className="space-y-5">
          <Card><CardHeader><CardTitle>{"Live API status"}</CardTitle></CardHeader><CardContent className="space-y-3"><div className="flex flex-wrap gap-2"><ApiStatus label="mode" value={result?.apiMode || "live"} /><ApiStatus label="flights" value={result.apiStatus?.flights} /><ApiStatus label="hotels" value={result.apiStatus?.hotels} /><ApiStatus label="places" value={result.apiStatus?.places} /><ApiStatus label="weather" value={result.apiStatus?.weather} /><ApiStatus label="events" value={result.apiStatus?.events} /><ApiStatus label="currency" value={result.apiStatus?.currency} /></div>{result.warnings?.length ? <div className="space-y-1">{result.warnings.map((w: string) => <p key={w} className="text-xs text-yellow-700 dark:text-yellow-200">• {w}</p>)}</div> : null}</CardContent></Card>

          {selectedFlight ? (
            <Card className="sticky top-4 z-20 border-primary/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75 shadow-lg mobile-wrap">
              <CardContent className="p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Selected flight</p>
                  <p className="font-semibold break-words">{selectedFlight.route}</p>
                  <p className="text-sm text-muted-foreground break-words">{selectedFlight.airline} {selectedFlight.flightNumber ? `• ${selectedFlight.flightNumber}` : ""}</p>
                </div>
                <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto lg:justify-end">
                  <div className="text-left lg:text-right">
                    <p className="text-xs text-muted-foreground">Total for {travelerCountNumber} traveler(s)</p>
                    <p className="font-bold text-lg">{formatCurrency(Number(selectedFlight.price || 0), selectedFlight.currency || form.currency)}</p>
                    {travelerCountNumber > 1 ? <p className="text-xs text-muted-foreground">{formatCurrency(Math.round(Number(selectedFlight.price || 0) / travelerCountNumber), selectedFlight.currency || form.currency)} per person</p> : null}
                  </div>
                  <Button type="button" variant="secondary" size="sm" className="w-full sm:w-auto" onClick={() => openFlightBooking(selectedFlight)}>Booking options</Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card className="border-primary/40 bg-primary/5"><CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5" /> AI selected optimal plan</CardTitle></CardHeader><CardContent className="space-y-4">
            <div className="grid lg:grid-cols-2 gap-4">
              <div className="rounded-2xl border bg-card p-4 mobile-wrap">
                <p className="text-xs text-muted-foreground mb-1">AI recommended flight</p>
                <>
                  <p className="font-semibold">{selectedFlight?.route || "No live flight selected"}</p>
                  <p className="text-sm text-muted-foreground mt-1">{selectedFlight?.airline || "Select a live flight below"}</p>
                  {selectedFlight?.price ? <p className="text-sm mt-2"><b>{formatCurrency(Number(selectedFlight.price), selectedFlight.currency || form.currency)}</b> total for {travelerCountNumber} traveler(s){travelerCountNumber > 1 ? ` • ${formatCurrency(Math.round(Number(selectedFlight.price) / travelerCountNumber), selectedFlight.currency || form.currency)} per person` : ""}</p> : null}
                  {displayBudget?.overBudget ? <p className="text-sm text-destructive mt-2">Selected flight is {formatCurrency(displayBudget.overBudget, form.currency)} over your total budget.</p> : null}
                  {selectedFlight?.bookingToken || selectedFlight?.departureToken || selectedFlight?.bookingUrl ? <Button type="button" variant="secondary" size="sm" className="mt-3 w-full sm:w-auto" onClick={() => openFlightBooking(selectedFlight)}>Booking options</Button> : null}
                </>
              </div>
              <div className="rounded-2xl border bg-card p-4">
                <p className="text-xs text-muted-foreground mb-1">AI recommended hotel</p>
                <p className="font-semibold">{selectedHotel?.name || "No hotel selected"}</p>
                <p className="text-sm text-muted-foreground mt-1">{selectedHotel?.price ? `${formatCurrency(Number(selectedHotel.price), selectedHotel.currency || form.currency)} total • ${selectedHotel?.source || result.hotelSource || "Hotel API"}` : "Select a hotel from the live SearchAPI hotel options below."}</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">{Object.entries(displayBudget || {}).filter(([k, v]) => typeof v === "number" && (k !== "overBudget" || Number(v) > 0)).map(([k, v]) => <div key={k} className={`rounded-xl border bg-muted/25 p-3 ${k === "overBudget" ? "border-destructive/50" : ""}`}><p className="text-xs text-muted-foreground capitalize">{String(k).replace(/([A-Z])/g, " $1")}</p><p className="text-lg font-bold">{formatCurrency(Number(v), form.currency)}</p></div>)}</div>
            {displayBudget?.aiSummary ? <div className={`rounded-xl border p-3 text-sm ${displayBudget.affordabilityGap ? "border-yellow-500/50 bg-yellow-500/5" : "bg-muted/20"}`}><b>AI budget decision:</b> {String(displayBudget.aiSummary)}</div> : null}
            {result.alternativePlans?.length ? <div className="grid md:grid-cols-3 gap-2">{result.alternativePlans.map((plan: any) => <div key={plan.type} className="rounded-xl border p-3 text-sm"><p className="font-semibold">{plan.title}</p><p className="text-xs text-muted-foreground mt-1">{plan.aiReason}</p><p className="mt-2 font-bold">{formatCurrency(Number(plan.budget?.flights || 0) + Number(plan.budget?.hotels || 0) + Number(plan.budget?.food || 0) + Number(plan.budget?.transport || 0) + Number(plan.budget?.activities || 0) + Number(plan.budget?.shopping || 0) + Number(plan.budget?.emergency || 0), form.currency)}</p></div>)}</div> : null}
            {result.recommendations?.length ? <div className="grid md:grid-cols-2 gap-2">{result.recommendations.map((x: string) => <div key={x} className="rounded-xl border p-3 text-sm">{x}</div>)}</div> : null}
          </CardContent></Card>

          <Card><CardHeader><CardTitle className="flex items-center gap-2"><Plane className="h-5 w-5" /> Flight options</CardTitle></CardHeader><CardContent className="space-y-4"><div className="rounded-2xl border bg-muted/20 p-4 space-y-4"><div className="grid md:grid-cols-2 xl:grid-cols-6 gap-3"><div><Label>Sort</Label><Select value={draftFlightSort} onChange={(e: any) => setDraftFlightSort(e.target.value)} className="mt-1"><option value="AI_BEST">AI best</option><option value="CHEAPEST">Cheapest</option><option value="FASTEST">Fastest</option><option value="FEWEST_STOPS">Fewest stops</option></Select></div><div><Label>Stops</Label><Select value={draftMaxStops} onChange={(e: any) => setDraftMaxStops(e.target.value)} className="mt-1"><option value="ANY">Any</option><option value="0">Direct only</option><option value="1">Max 1 stop</option><option value="2">Max 2 stops</option></Select></div><div><Label>Airline</Label><Select value={draftAirlineFilter} onChange={(e: any) => setDraftAirlineFilter(e.target.value)} className="mt-1"><option value="ALL">All airlines</option>{availableAirlines.map((name) => <option key={name} value={name}>{name}</option>)}</Select></div><div><Label>Departure</Label><Select value={draftDepartureTimeFilter} onChange={(e: any) => setDraftDepartureTimeFilter(e.target.value)} className="mt-1"><option value="ANY">Any time</option><option value="MORNING">Morning</option><option value="AFTERNOON">Afternoon</option><option value="EVENING">Evening</option><option value="NIGHT">Night</option></Select></div><div><Label>Max budget</Label><Input type="number" value={draftMaxFlightBudget} onChange={(e) => setDraftMaxFlightBudget(e.target.value)} placeholder="No limit" className="mt-1" /></div><div className="flex items-end"><label className="flex items-center gap-2 text-sm rounded-xl border px-3 py-2 h-10 w-full"><input type="checkbox" checked={draftDirectOnly} onChange={(e) => setDraftDirectOnly(e.target.checked)} /> Direct only</label></div></div><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mobile-wrap"><p className="text-xs text-muted-foreground">Showing only the {filteredFlights.length} flight option(s) matching the applied filters out of {result.flights?.length || 0}. Change fields, then press Apply.</p><div className="grid grid-cols-1 gap-2 sm:flex"><Button type="button" size="sm" className="w-full sm:w-auto" onClick={applyFlightFilters}>Apply filters</Button><Button type="button" size="sm" variant="outline" className="w-full sm:w-auto" onClick={resetFlightFilters}>Reset filters</Button></div></div></div>{filteredFlights?.length ? filteredFlights.map((f: any, i: number) => { const active = selectedFlightId === f.id; const recommended = result.recommendedFlightId === f.id; return <div key={f.id || i} className={`rounded-2xl border p-5 grid lg:grid-cols-[1fr_auto] gap-4 transition-colors mobile-wrap ${active ? "border-primary bg-primary/10" : "hover:bg-muted/30"}`}>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-lg break-words">{f.route}</p><Badge variant="secondary">{f.source || result.flightSource || "Live API"}</Badge><Badge variant="outline">{f.cabinClass || form.flightCabin?.replace("_", " ") || "Economy"}</Badge>{recommended && <Badge variant="success">AI recommended</Badge>}{active && <Badge variant="default">Selected</Badge>}</div>
              {f.outbound ? (
                <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                  <div className="rounded-xl border bg-card/60 p-3">
                    <p className="font-semibold text-foreground mb-2">Outbound</p>
                    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-2">
                      <p><b className="text-foreground">Route:</b> {f.outbound.route}</p>
                      <p><b className="text-foreground">Airline:</b> {f.outbound.airline}{f.outbound.flightNumber ? ` • ${f.outbound.flightNumber}` : ""}</p>
                      <p><b className="text-foreground">Depart:</b> {f.outbound.departureTime}</p>
                      <p><b className="text-foreground">Arrive:</b> {f.outbound.arrivalTime}</p>
                      <p><b className="text-foreground">Duration:</b> {f.outbound.duration}</p>
                      <p><b className="text-foreground">Stops:</b> {Number.isFinite(f.outbound.stops) ? `${f.outbound.stops}` : "N/A"}</p>
                    </div>
                  </div>
                  {f.inbound ? (
                    <div className="rounded-xl border bg-card/60 p-3">
                      <p className="font-semibold text-foreground mb-2">Return</p>
                      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-2">
                        <p><b className="text-foreground">Route:</b> {f.inbound.route}</p>
                        <p><b className="text-foreground">Airline:</b> {f.inbound.airline}{f.inbound.flightNumber ? ` • ${f.inbound.flightNumber}` : ""}</p>
                        <p><b className="text-foreground">Depart:</b> {f.inbound.departureTime}</p>
                        <p><b className="text-foreground">Arrive:</b> {f.inbound.arrivalTime}</p>
                        <p><b className="text-foreground">Duration:</b> {f.inbound.duration}</p>
                        <p><b className="text-foreground">Stops:</b> {Number.isFinite(f.inbound.stops) ? `${f.inbound.stops}` : "N/A"}</p>
                      </div>
                    </div>
                  ) : (form.tripType === "ROUND_TRIP" ? <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-3 text-yellow-700 dark:text-yellow-200">Return flight detail was not returned for this round-trip option.</div> : <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-3 text-blue-700 dark:text-blue-200">One-way ticket selected: no return flight is required.</div>)}
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-2 mt-3 text-sm text-muted-foreground">
                  <p><b className="text-foreground">Airline:</b> {f.airline || "Not provided"}{f.flightNumber ? ` • ${f.flightNumber}` : ""}</p>
                  <p><b className="text-foreground">Depart:</b> {f.departureTime || form.departureDate}</p>
                  <p><b className="text-foreground">Arrive:</b> {f.arrivalTime || form.departureDate}</p>
                  <p><b className="text-foreground">Duration:</b> {f.duration || "Not provided"}</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">{Number.isFinite(f.stops) ? `${f.stops} total stop(s)` : "Stops not provided"}</p>
              {f.aiReason ? <p className="text-xs text-primary mt-2">{f.aiReason}</p> : null}
            </div>
            <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between lg:w-auto lg:flex-col lg:items-end">
              <div className="text-right"><p className="text-xs text-muted-foreground">Total for {travelerCountNumber} traveler(s)</p><p className="font-bold text-xl">{f.price ? formatCurrency(Number(f.price), f.currency || form.currency) : "No price"}</p>{f.price && travelerCountNumber > 1 ? <p className="text-xs text-muted-foreground">{formatCurrency(Math.round(Number(f.price) / travelerCountNumber), f.currency || form.currency)} per person</p> : null}</div>
              <Button variant={active ? "default" : "outline"} className="w-full sm:w-auto" onClick={() => setSelectedFlightId(f.id)}>{active ? "Selected" : "Select flight"}</Button>
              {f.bookingToken || f.departureToken || f.bookingUrl ? <Button type="button" variant="secondary" size="sm" className="w-full sm:w-auto" onClick={() => openFlightBooking(f)}>Booking options</Button> : null}
            </div>
          </div>}) : <div className="rounded-xl border border-destructive/40 p-4 text-sm text-destructive flex gap-2"><AlertTriangle className="h-4 w-4" /> No flight matches these filters. Clear filters or generate another route/date.</div>}</CardContent></Card>

          <Card><CardHeader><CardTitle className="flex items-center gap-2"><Hotel className="h-5 w-5" /> Live hotel options</CardTitle></CardHeader><CardContent className="space-y-4">
            {result.hotels?.length ? result.hotels.map((h: any, i: number) => { const active = selectedHotelId === h.id; const recommended = result.recommendedHotelId === h.id; return <div key={h.id || i} className={`rounded-2xl border p-5 grid lg:grid-cols-[180px_1fr_auto] gap-4 transition-colors ${active ? "border-primary bg-primary/10" : "hover:bg-muted/30"}`}>
              <div className="rounded-xl bg-muted overflow-hidden min-h-32 flex items-center justify-center">
                {h.image ? <img src={h.image} alt={h.name || "Hotel photo"} className="h-32 w-full object-cover" /> : <Hotel className="h-10 w-10 text-muted-foreground" />}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-lg">{h.name}</p><Badge variant="secondary">{h.source || result.hotelSource || "Live Hotel API"}</Badge>{recommended && <Badge variant="success">AI recommended</Badge>}{active && <Badge variant="default">Selected</Badge>}</div>
                <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-2 mt-3 text-sm text-muted-foreground">
                  <p><b className="text-foreground">City:</b> {h.city || arrivalAirport?.city || "N/A"}</p>
                  <p><b className="text-foreground">Rating:</b> {h.reviewScore || h.rating || "N/A"}{h.reviewCount ? ` / ${h.reviewCount} reviews` : ""}</p>
                  <p><b className="text-foreground">Stars:</b> {h.stars || "N/A"}</p>
                  <p><b className="text-foreground">Nights:</b> {h.nights || days}</p>
                  <p><b className="text-foreground">Check-in:</b> {h.checkIn || form.departureDate}</p>
                  <p><b className="text-foreground">Check-out:</b> {h.checkOut || form.returnDate}</p>
                  <p className="sm:col-span-2"><b className="text-foreground">Address:</b> {h.address || "Address not returned"}</p>
                </div>
                {h.amenities?.length ? <p className="text-xs text-muted-foreground mt-3"><b>Amenities:</b> {h.amenities.slice(0, 6).join(", ")}</p> : null}
                {h.aiReason ? <p className="text-xs text-primary mt-2">{h.aiReason}</p> : null}
              </div>
              <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between lg:w-auto lg:flex-col lg:items-end">
                <div className="text-right"><p className="text-xs text-muted-foreground">Hotel total</p><p className="font-bold text-xl">{h.price ? formatCurrency(Number(h.price), h.currency || form.currency) : "No price"}</p>{h.originalPrice && h.originalCurrency && h.originalCurrency !== (h.currency || form.currency) ? <p className="text-xs text-muted-foreground">Original: {h.originalPrice} {h.originalCurrency}</p> : null}</div>
                <Button variant={active ? "default" : "outline"} className="w-full sm:w-auto" onClick={() => setSelectedHotelId(h.id)}>{active ? "Selected" : "Select hotel"}</Button>
                <Button type="button" variant="secondary" size="sm" className="w-full sm:w-auto" onClick={() => openHotelBooking(h)}>Open hotel</Button>
              </div>
            </div>}) : <div className="rounded-xl border border-destructive/40 p-4 text-sm text-destructive flex gap-2"><AlertTriangle className="h-4 w-4" /> No live hotel options returned. Check SEARCHAPI_KEY, destination and dates. No mock hotel data is shown.</div>}
          </CardContent></Card>

          <Card><CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" /> Places to visit</CardTitle></CardHeader><CardContent className="space-y-3">
            {result.places?.length ? <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">{result.places.slice(0, 12).map((p: any, i: number) => <div key={p.id || i} className="rounded-xl border p-4 flex flex-col gap-3"><div className="flex items-start justify-between gap-2"><p className="font-semibold">{p.name}</p><Badge variant="secondary">{p.category || "place"}</Badge></div><p className="text-xs text-muted-foreground">{p.address || p.city || "Address not returned"}</p>{p.distanceMeters ? <p className="text-xs text-muted-foreground">~{Math.round(p.distanceMeters / 100) / 10} km from search center</p> : null}<Button type="button" variant="secondary" size="sm" className="mt-auto w-full" onClick={() => openPlaceOrRestaurant(p)}>Open place / map</Button></div>)}</div> : <p className="text-sm text-muted-foreground">No real places returned. Check GEOAPIFY_API_KEY or destination coordinates.</p>}
          </CardContent></Card>

          <Card><CardHeader><CardTitle className="flex items-center gap-2"><Utensils className="h-5 w-5" /> Restaurants / food stops</CardTitle></CardHeader><CardContent className="space-y-3">
            {result.restaurants?.length ? <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">{result.restaurants.slice(0, 9).map((r: any, i: number) => <div key={r.id || i} className="rounded-xl border p-4 flex flex-col gap-3"><p className="font-semibold">{r.name}</p><p className="text-xs text-muted-foreground">{r.address || r.city || "Address not returned"}</p>{r.estimatedCost ? <p className="text-xs text-muted-foreground">Estimated meal: {formatCurrency(r.estimatedCost, form.currency)}</p> : null}<Button type="button" variant="secondary" size="sm" className="mt-auto w-full" onClick={() => openPlaceOrRestaurant(r)}>Open restaurant / map</Button></div>)}</div> : <p className="text-sm text-muted-foreground">No restaurants returned yet.</p>}
          </CardContent></Card>

          <Card><CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> Events during trip</CardTitle></CardHeader><CardContent className="space-y-3">
            {result.events?.length ? <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">{result.events.slice(0, 9).map((ev: any, i: number) => <div key={ev.id || i} className="rounded-xl border p-4 flex flex-col gap-3"><div className="flex items-start justify-between gap-2"><p className="font-semibold">{ev.name}</p><Badge variant="secondary">{ev.category || "event"}</Badge></div><p className="text-xs text-muted-foreground">{ev.venue || ev.city || "Venue not returned"}</p>{ev.start ? <p className="text-xs text-muted-foreground">{ev.start}</p> : null}{ev.minPrice !== undefined ? <p className="text-xs text-muted-foreground">From {formatCurrency(Number(ev.minPrice || 0), ev.currency || form.currency)}</p> : null}<Button type="button" variant="secondary" size="sm" className="mt-auto w-full" onClick={() => openEvent(ev)}>Open event / tickets</Button></div>)}</div> : <p className="text-sm text-muted-foreground">No Eventbrite events returned for this destination/date range.</p>}
          </CardContent></Card>

          <Card><CardHeader><CardTitle>Weather forecast</CardTitle></CardHeader><CardContent className="space-y-3">
            {result.weather?.length ? <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">{result.weather.slice(0, 8).map((w: any, i: number) => <div key={w.date || i} className="rounded-xl border p-4"><p className="font-semibold">{w.date}</p><p className="text-sm mt-1">{w.minTempC ?? "?"}°C - {w.maxTempC ?? "?"}°C</p><p className="text-xs text-muted-foreground mt-1">Rain: {w.precipitationMm ?? 0} mm</p><p className="text-xs text-muted-foreground mt-2">{w.note}</p></div>)}</div> : <p className="text-sm text-muted-foreground">No weather forecast returned. Open-Meteo needs valid destination coordinates.</p>}
          </CardContent></Card>

          <Card><CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> Daily itinerary</CardTitle></CardHeader><CardContent className="space-y-3">{result.dailyItinerary?.length ? result.dailyItinerary.map((d: any) => <div key={d.day} className="rounded-xl border p-4"><div className="flex items-center justify-between gap-3"><p className="font-semibold">Day {d.day}: {d.title}</p><Badge variant="secondary">{formatCurrency(d.estimatedDailyCost, form.currency)}</Badge></div><div className="grid sm:grid-cols-3 gap-2 mt-3 text-sm"><p><b>Morning:</b> {d.morning}</p><p><b>Afternoon:</b> {d.afternoon}</p><p><b>Evening:</b> {d.evening}</p></div>{d.weatherNote ? <p className="text-xs text-muted-foreground mt-3"><b>Weather:</b> {d.weatherNote}</p> : null}{d.places?.length ? <p className="text-xs text-muted-foreground mt-1"><b>Places:</b> {d.places.join(", ")}</p> : null}</div>) : <p className="text-sm text-muted-foreground">No itinerary was returned by the backend. Regenerate after selecting interests and dates.</p>}</CardContent></Card>

          <div className="flex flex-col sm:flex-row gap-3 justify-end"><Button variant="outline" onClick={() => generate("live")}>Regenerate</Button><Button onClick={saveTrip} loading={saving}>Save to My Trips</Button></div>
        </div>
      )}
    </div>
  );
}
