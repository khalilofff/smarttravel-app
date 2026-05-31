import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getLocalServerSession } from "@/lib/local-auth";

const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY || "";

function clean(value: unknown) {
  return String(value || "").trim();
}

function safeUrl(url: string) {
  return GEOAPIFY_API_KEY ? url.replace(GEOAPIFY_API_KEY, "GEOAPIFY_API_KEY") : url;
}

function categoryFromGeo(categories: string[] = []) {
  const joined = categories.join(" ").toLowerCase();
  if (joined.includes("catering") || joined.includes("restaurant") || joined.includes("food")) return "food";
  if (joined.includes("museum")) return "museum";
  if (joined.includes("commercial") || joined.includes("shopping")) return "shopping";
  if (joined.includes("park") || joined.includes("leisure")) return "park";
  if (joined.includes("entertainment")) return "activity";
  if (joined.includes("tourism") || joined.includes("sights")) return "landmark";
  return "activity";
}

async function resolveTripDestination(req: NextRequest, cityParam: string) {
  if (cityParam && cityParam !== "All") return { city: cityParam, country: "" };
  const session = await getLocalServerSession().catch(() => null);
  if (!session?.user?.id) return { city: "", country: "" };
  const tripId = new URL(req.url).searchParams.get("tripId");
  const trip = await prisma.trip.findFirst({
    where: tripId
      ? { id: tripId, userId: session.user.id }
      : { userId: session.user.id },
    include: { destinations: { orderBy: { orderIndex: "asc" }, take: 1 } },
    orderBy: { updatedAt: "desc" },
  });
  const first = trip?.destinations?.[0];
  return { city: first?.name || "", country: first?.country || "", tripTitle: trip?.title || "" };
}

async function geocode(destination: string) {
  const params = new URLSearchParams({ text: destination, limit: "1", apiKey: GEOAPIFY_API_KEY });
  const url = `https://api.geoapify.com/v1/geocode/search?${params.toString()}`;
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Geoapify geocode HTTP ${res.status}`);
  const props = data?.features?.[0]?.properties;
  if (!props?.lat || !props?.lon) return null;
  return { lat: Number(props.lat), lon: Number(props.lon), city: props.city || props.name || destination, country: props.country || "" };
}

async function fetchLivePlaces(destination: string, category: string, search: string, sortBy: string) {
  if (!GEOAPIFY_API_KEY) {
    return { status: "api_key_missing", diagnostics: { message: "GEOAPIFY_API_KEY is missing from .env.local" }, rows: [] as any[] };
  }
  const location = await geocode(destination);
  if (!location) return { status: "location_not_found", diagnostics: { message: `No coordinates found for ${destination}` }, rows: [] as any[] };

  const geoCategories = category && category !== "All"
    ? category === "food" ? "catering,catering.restaurant"
      : category === "museum" ? "entertainment.museum,tourism.sights"
      : category === "shopping" ? "commercial,commercial.shopping_mall"
      : category === "park" ? "leisure.park,natural"
      : category === "landmark" ? "tourism,tourism.sights"
      : "tourism,catering,entertainment,leisure,commercial"
    : "tourism,tourism.sights,catering,catering.restaurant,entertainment,leisure,commercial";

  const params = new URLSearchParams({
    categories: geoCategories,
    bias: `proximity:${location.lon},${location.lat}`,
    limit: "60",
    apiKey: GEOAPIFY_API_KEY,
  });
  if (search) params.set("name", search);
  const url = `https://api.geoapify.com/v2/places?${params.toString()}`;
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Geoapify places HTTP ${res.status}`);

  let rows = (data?.features || [])
    .map((item: any, index: number) => {
      const p = item?.properties || {};
      const categories = Array.isArray(p.categories) ? p.categories : [];
      const name = clean(p.name);
      if (!name) return null;
      const rating = Number(p.datasource?.raw?.rating || p.rating || 0) || null;
      return {
        id: p.place_id || p.datasource?.raw?.osm_id || `geoapify-${index}`,
        name,
        city: p.city || location.city || destination,
        country: p.country || location.country || "",
        description: clean(p.formatted || p.address_line2 || p.address_line1 || `${name} in ${destination}`),
        category: categoryFromGeo(categories),
        latitude: Number(p.lat),
        longitude: Number(p.lon),
        rating: rating || 4.2,
        priceLevel: 0,
        imageUrl: "",
        tags: categories.slice(0, 5),
        openingHours: p.opening_hours || "",
        estimatedDuration: "",
        estimatedCost: null,
        currency: "USD",
        isFeatured: false,
        isActive: true,
        source: "Geoapify",
        website: p.website || p.datasource?.raw?.website || "",
      };
    })
    .filter(Boolean);

  if (search) {
    const s = search.toLowerCase();
    rows = rows.filter((x: any) => x.name.toLowerCase().includes(s) || x.description.toLowerCase().includes(s));
  }
  if (sortBy === "name") rows.sort((a: any, b: any) => a.name.localeCompare(b.name));
  else if (sortBy === "price") rows.sort((a: any, b: any) => Number(a.priceLevel || 0) - Number(b.priceLevel || 0));
  else rows.sort((a: any, b: any) => Number(b.rating || 0) - Number(a.rating || 0));

  return { status: rows.length ? "live" : "empty", diagnostics: { provider: "Geoapify", destination, url: safeUrl(url), count: rows.length }, rows: rows.slice(0, 50) };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = clean(searchParams.get("search"));
    const cityParam = clean(searchParams.get("city"));
    const category = clean(searchParams.get("category"));
    const sortBy = clean(searchParams.get("sortBy")) || "rating";
    const resolved = await resolveTripDestination(req, cityParam);
    const destination = [resolved.city, resolved.country].filter(Boolean).join(", ");
    if (!destination) {
      return NextResponse.json({
        items: [],
        status: "no_trip_destination",
        message: "Create or select a trip first. Explore now uses real API data only and will not show mock destinations.",
      });
    }
    const live = await fetchLivePlaces(destination, category, search, sortBy);
    return NextResponse.json({ items: live.rows, status: live.status, diagnostics: live.diagnostics, destination: resolved });
  } catch (error: any) {
    return NextResponse.json({ items: [], status: "api_error", error: error?.message || "Failed to fetch live destinations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getLocalServerSession();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;
    const body = await req.json();
    const tripId = clean(body.tripId);
    const place = body.place || {};
    if (!tripId) return NextResponse.json({ error: "tripId required" }, { status: 400 });
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, OR: [{ userId }, { collaborators: { some: { userId, status: "ACCEPTED" } } }] },
      include: { itinerary: { include: { days: { orderBy: { dayNumber: "asc" }, take: 1 } } } },
    });
    if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    const name = clean(place.name);
    if (!name) return NextResponse.json({ error: "Place name is required" }, { status: 400 });

    let itinerary = trip.itinerary;
    if (!itinerary) {
      itinerary = await prisma.itinerary.create({ data: { tripId, generatedBy: "explore-live", isAccepted: true }, include: { days: true } });
    }
    let day = itinerary.days?.[0];
    if (!day) {
      day = await prisma.itineraryDay.create({
        data: { itineraryId: itinerary.id, dayNumber: 1, date: trip.startDate, title: "Day 1", notes: "Places added from Explore live results." },
      });
    }
    const count = await prisma.itineraryItem.count({ where: { dayId: day.id } });
    const item = await prisma.itineraryItem.create({
      data: {
        dayId: day.id,
        title: name,
        description: clean(place.description || place.address || "Live place added from Explore."),
        location: [place.city, place.country].filter(Boolean).join(", ") || clean(place.address),
        latitude: Number(place.latitude || 0) || null,
        longitude: Number(place.longitude || 0) || null,
        category: clean(place.category || "activity"),
        tags: JSON.stringify(Array.isArray(place.tags) ? place.tags.slice(0, 8) : []),
        orderIndex: count,
        notes: `Source: ${clean(place.source || "Geoapify")}`,
      },
    });
    return NextResponse.json({ ok: true, item });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Could not add this place to the trip" }, { status: 500 });
  }
}
