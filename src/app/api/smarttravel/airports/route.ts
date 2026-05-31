import { NextRequest, NextResponse } from "next/server";

const FLIGHT_API_KEY = process.env.FLIGHT_API_KEY || "";

type Airport = {
  id: string;
  city: string;
  country: string;
  label: string;
  iata: string;
  airport: string;
  terminal?: string;
  latitude?: number;
  longitude?: number;
  source?: string;
  note?: string;
  raw?: any;
};

const AIRPORT_DIRECTORY: Airport[] = [
  { id: "GYD", city: "Baku", country: "Azerbaijan", label: "Baku - GYD", iata: "GYD", airport: "Heydar Aliyev International Airport", latitude: 40.4675, longitude: 50.0467 },
  { id: "BUS", city: "Batumi", country: "Georgia", label: "Batumi - BUS", iata: "BUS", airport: "Batumi International Airport", latitude: 41.6103, longitude: 41.5997 },
  { id: "TBS", city: "Tbilisi", country: "Georgia", label: "Tbilisi - TBS", iata: "TBS", airport: "Tbilisi International Airport", latitude: 41.6692, longitude: 44.9547 },
  { id: "IST", city: "Istanbul", country: "Turkey", label: "Istanbul - IST", iata: "IST", airport: "Istanbul Airport", latitude: 41.2753, longitude: 28.7519 },
  { id: "SAW", city: "Istanbul", country: "Turkey", label: "Istanbul - SAW", iata: "SAW", airport: "Sabiha Gokcen International Airport", latitude: 40.8986, longitude: 29.3092 },
  { id: "ESB", city: "Ankara", country: "Turkey", label: "Ankara - ESB", iata: "ESB", airport: "Esenboga Airport", latitude: 40.1281, longitude: 32.9951 },
  { id: "ADB", city: "Izmir", country: "Turkey", label: "Izmir - ADB", iata: "ADB", airport: "Adnan Menderes Airport", latitude: 38.2924, longitude: 27.1569 },
  { id: "AYT", city: "Antalya", country: "Turkey", label: "Antalya - AYT", iata: "AYT", airport: "Antalya Airport", latitude: 36.8987, longitude: 30.8005 },
  { id: "DXB", city: "Dubai", country: "United Arab Emirates", label: "Dubai - DXB", iata: "DXB", airport: "Dubai International Airport", latitude: 25.2532, longitude: 55.3657 },
  { id: "AUH", city: "Abu Dhabi", country: "United Arab Emirates", label: "Abu Dhabi - AUH", iata: "AUH", airport: "Zayed International Airport", latitude: 24.4438, longitude: 54.6511 },
  { id: "DOH", city: "Doha", country: "Qatar", label: "Doha - DOH", iata: "DOH", airport: "Hamad International Airport", latitude: 25.2731, longitude: 51.6081 },
  { id: "LHR", city: "London", country: "United Kingdom", label: "London - LHR", iata: "LHR", airport: "Heathrow Airport", latitude: 51.47, longitude: -0.4543 },
  { id: "LGW", city: "London", country: "United Kingdom", label: "London - LGW", iata: "LGW", airport: "Gatwick Airport", latitude: 51.1537, longitude: -0.1821 },
  { id: "LTN", city: "London", country: "United Kingdom", label: "London - LTN", iata: "LTN", airport: "London Luton Airport", latitude: 51.8747, longitude: -0.3683 },
  { id: "STN", city: "London", country: "United Kingdom", label: "London - STN", iata: "STN", airport: "London Stansted Airport", latitude: 51.885, longitude: 0.235 },
  { id: "CDG", city: "Paris", country: "France", label: "Paris - CDG", iata: "CDG", airport: "Charles de Gaulle Airport", latitude: 49.0097, longitude: 2.5479 },
  { id: "ORY", city: "Paris", country: "France", label: "Paris - ORY", iata: "ORY", airport: "Paris Orly Airport", latitude: 48.7262, longitude: 2.3652 },
  { id: "MXP", city: "Milan", country: "Italy", label: "Milan - MXP", iata: "MXP", airport: "Milan Malpensa Airport", latitude: 45.63, longitude: 8.7231 },
  { id: "LIN", city: "Milan", country: "Italy", label: "Milan - LIN", iata: "LIN", airport: "Milan Linate Airport", latitude: 45.4451, longitude: 9.2767 },
  { id: "BGY", city: "Milan", country: "Italy", label: "Milan/Bergamo - BGY", iata: "BGY", airport: "Milan Bergamo Airport", latitude: 45.6739, longitude: 9.7042 },
  { id: "FCO", city: "Rome", country: "Italy", label: "Rome - FCO", iata: "FCO", airport: "Leonardo da Vinci Fiumicino Airport", latitude: 41.8003, longitude: 12.2389 },
  { id: "CIA", city: "Rome", country: "Italy", label: "Rome - CIA", iata: "CIA", airport: "Ciampino Airport", latitude: 41.7994, longitude: 12.5949 },
  { id: "BCN", city: "Barcelona", country: "Spain", label: "Barcelona - BCN", iata: "BCN", airport: "Barcelona El Prat Airport", latitude: 41.2974, longitude: 2.0833 },
  { id: "MAD", city: "Madrid", country: "Spain", label: "Madrid - MAD", iata: "MAD", airport: "Adolfo Suarez Madrid-Barajas Airport", latitude: 40.4983, longitude: -3.5676 },
  { id: "BER", city: "Berlin", country: "Germany", label: "Berlin - BER", iata: "BER", airport: "Berlin Brandenburg Airport", latitude: 52.3667, longitude: 13.5033 },
  { id: "FRA", city: "Frankfurt", country: "Germany", label: "Frankfurt - FRA", iata: "FRA", airport: "Frankfurt Airport", latitude: 50.0379, longitude: 8.5622 },
  { id: "MUC", city: "Munich", country: "Germany", label: "Munich - MUC", iata: "MUC", airport: "Munich Airport", latitude: 48.3538, longitude: 11.7861 },
  { id: "AMS", city: "Amsterdam", country: "Netherlands", label: "Amsterdam - AMS", iata: "AMS", airport: "Amsterdam Schiphol Airport", latitude: 52.3105, longitude: 4.7683 },
  { id: "VIE", city: "Vienna", country: "Austria", label: "Vienna - VIE", iata: "VIE", airport: "Vienna International Airport", latitude: 48.1103, longitude: 16.5697 },
  { id: "PRG", city: "Prague", country: "Czech Republic", label: "Prague - PRG", iata: "PRG", airport: "Vaclav Havel Airport Prague", latitude: 50.1008, longitude: 14.26 },
  { id: "BUD", city: "Budapest", country: "Hungary", label: "Budapest - BUD", iata: "BUD", airport: "Budapest Ferenc Liszt International Airport", latitude: 47.4298, longitude: 19.2611 },
  { id: "WAW", city: "Warsaw", country: "Poland", label: "Warsaw - WAW", iata: "WAW", airport: "Warsaw Chopin Airport", latitude: 52.1657, longitude: 20.9671 },
  { id: "ATH", city: "Athens", country: "Greece", label: "Athens - ATH", iata: "ATH", airport: "Athens International Airport", latitude: 37.9364, longitude: 23.9445 },
  { id: "JFK", city: "New York", country: "United States", label: "New York - JFK", iata: "JFK", airport: "John F. Kennedy International Airport", latitude: 40.6413, longitude: -73.7781 },
  { id: "EWR", city: "New York", country: "United States", label: "New York/Newark - EWR", iata: "EWR", airport: "Newark Liberty International Airport", latitude: 40.6895, longitude: -74.1745 },
  { id: "LAX", city: "Los Angeles", country: "United States", label: "Los Angeles - LAX", iata: "LAX", airport: "Los Angeles International Airport", latitude: 33.9416, longitude: -118.4085 },
  { id: "SFO", city: "San Francisco", country: "United States", label: "San Francisco - SFO", iata: "SFO", airport: "San Francisco International Airport", latitude: 37.6213, longitude: -122.379 },
  { id: "NRT", city: "Tokyo", country: "Japan", label: "Tokyo - NRT", iata: "NRT", airport: "Narita International Airport", latitude: 35.772, longitude: 140.3929 },
  { id: "HND", city: "Tokyo", country: "Japan", label: "Tokyo - HND", iata: "HND", airport: "Tokyo Haneda Airport", latitude: 35.5494, longitude: 139.7798 },
  { id: "ICN", city: "Seoul", country: "South Korea", label: "Seoul - ICN", iata: "ICN", airport: "Incheon International Airport", latitude: 37.4602, longitude: 126.4407 },
  { id: "SIN", city: "Singapore", country: "Singapore", label: "Singapore - SIN", iata: "SIN", airport: "Singapore Changi Airport", latitude: 1.3644, longitude: 103.9915 },
];

function normalizeText(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function matches(a: Airport, q: string) {
  const query = normalizeText(q);
  if (!query) return false;
  const code = a.iata.toLowerCase();
  if (query.length === 3 && code === query) return true;
  const fields = [a.city, a.airport, a.country, a.label].map(normalizeText);
  return fields.some((x) => x === query || x.startsWith(query) || x.includes(` ${query}`));
}

function unique(items: Airport[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.iata || `${item.city}-${item.airport}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeFlightApiAirport(item: any, index: number): Airport | null {
  const code = String(item?.fs || item?.iata || item?.code || item?.airport_code || item?.iataCode || "").toUpperCase();
  const name = String(item?.name || item?.airport || item?.airportName || item?.city || "").trim();
  if (!/^[A-Z]{3}$/.test(code) && !name) return null;
  const directoryMatch = AIRPORT_DIRECTORY.find((a) => a.iata === code || normalizeText(a.airport) === normalizeText(name));
  return {
    id: `live-${code || index}`,
    city: directoryMatch?.city || String(item?.city || item?.cityName || name).replace(/ International Airport| Airport/gi, "").trim(),
    country: directoryMatch?.country || String(item?.country || item?.countryName || "").trim(),
    label: `${directoryMatch?.city || item?.city || name}${code ? ` - ${code}` : ""}`,
    iata: code,
    airport: directoryMatch?.airport || name || `${code} Airport`,
    latitude: directoryMatch?.latitude,
    longitude: directoryMatch?.longitude,
    source: "FlightAPI live IATA search",
    note: "Live airport/code result. Terminal information is normally returned later in selected flight details when the airline/provider includes it.",
    raw: item,
  };
}

async function flightApiIataSearch(query: string) {
  if (!FLIGHT_API_KEY) return { ok: false, status: 0, url: "", items: [] as Airport[], error: "FLIGHT_API_KEY missing" };
  const url = `https://api.flightapi.io/iata/${encodeURIComponent(FLIGHT_API_KEY)}?name=${encodeURIComponent(query)}&type=airport`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    const data: any = await res.json().catch(() => null);
    const raw = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    const items = raw.map(normalizeFlightApiAirport).filter(Boolean) as Airport[];
    return { ok: res.ok && !data?.error, status: res.status, url, items, error: data?.error || (res.ok ? undefined : `HTTP ${res.status}`) };
  } catch (error: any) {
    return { ok: false, status: 0, url, items: [], error: error?.message || "FlightAPI IATA search failed" };
  }
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query")?.trim() || "";
  if (query.length < 2) {
    return NextResponse.json({ ok: true, query, airports: [], diagnostics: { message: "Type at least 2 characters, then choose a city/airport from the list." } });
  }

  const live = await flightApiIataSearch(query);
  const liveMatches = live.items.filter((a) => a.iata && matches(a, query));
  const directoryMatches = AIRPORT_DIRECTORY.filter((a) => matches(a, query)).map((a) => ({
    ...a,
    id: `dir-${a.iata}`,
    source: "Built-in airport directory",
    note: "Airport directory result used for reliable city selection. Flight prices still come only from the live flight API.",
  }));

  const airports = unique([...liveMatches, ...directoryMatches]).slice(0, 12);
  return NextResponse.json({
    ok: airports.length > 0,
    source: liveMatches.length ? "FlightAPI live IATA search" : "Built-in airport directory",
    query,
    airports,
    diagnostics: {
      flightapi: { ok: live.ok, status: live.status, error: live.error, url: live.url ? live.url.replace(FLIGHT_API_KEY, "FLIGHT_API_KEY") : "", count: live.items.length, filtered: liveMatches.length },
      directory: { count: directoryMatches.length },
      message: airports.length ? "Choose one of the airport results from the list." : "No city/airport result found. Try city name or IATA code such as Baku/GYD, Istanbul/IST, Milan/MXP, Batumi/BUS.",
    },
  });
}
