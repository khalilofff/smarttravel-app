import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const departureAirport = body.departureAirport || null;
    const arrivalAirport = body.arrivalAirport || null;
    const tripType = String(body.tripType || "ROUND_TRIP").toUpperCase();
    const departureDate = String(body.departureDate || "").trim();
    const returnDate = tripType === "ONE_WAY" ? "" : String(body.returnDate || "").trim();
    const travelerCount = Math.max(1, Math.min(9, Number(body.travelerCount || 1)));
    const currency = String(body.currency || "USD").toUpperCase();
    const flightCabin = String(body.flightCabin || "ECONOMY").toUpperCase();
    const flightProvider = String(body.flightProvider || "AUTO").toUpperCase();

    if (!departureAirport?.iata || !arrivalAirport?.iata) {
      return NextResponse.json({ error: "Select real departure and destination airports first." }, { status: 400 });
    }
    if (!departureDate) {
      return NextResponse.json({ error: "Departure date is required." }, { status: 400 });
    }
    if (tripType !== "ONE_WAY" && !returnDate) {
      return NextResponse.json({ error: "Return date is required for round-trip search." }, { status: 400 });
    }

    const planPayload = {
      tripType,
      departureDate,
      returnDate,
      travelerCount,
      travelerType: "SOLO",
      travelStyle: "MODERATE",
      totalBudget: Number(body.totalBudget || 9999),
      currency,
      flightCabin,
      flightProvider,
      departureCity: departureAirport.city,
      destinationCity: arrivalAirport.city,
      departureAirport,
      arrivalAirport,
      departureIata: departureAirport.iata,
      arrivalIata: arrivalAirport.iata,
      departureKiwiSlug: departureAirport.kiwiSlug,
      arrivalKiwiSlug: arrivalAirport.kiwiSlug,
      departureSearchText: body.departureSearchText || departureAirport.city || departureAirport.iata,
      destinationSearchText: body.destinationSearchText || arrivalAirport.city || arrivalAirport.iata,
      accommodationPreference: "Hotel",
      hotelQuality: "3-4 star",
      pace: "MODERATE",
      interests: [],
      notes: "Flight Search page: flight-only search; no trip is created.",
    };

    const url = new URL("/api/smarttravel/plan", req.url);
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(planPayload),
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json({ error: data?.error || data?.detail || "Flight search failed.", diagnostics: data }, { status: response.status });
    }

    return NextResponse.json({
      ok: true,
      flights: Array.isArray(data?.flights) ? data.flights : [],
      recommendedFlightId: data?.recommendedFlightId || data?.recommendedFlight?.id || "",
      recommendedFlight: data?.recommendedFlight || null,
      flightSource: data?.flightSource || data?.apiStatus?.flights || "Flight provider",
      flightProvider: data?.flightProvider || flightProvider,
      apiStatus: data?.apiStatus || {},
      apiDiagnostics: data?.apiDiagnostics?.flights || data?.apiDiagnostics || {},
      input: {
        departureAirport,
        arrivalAirport,
        tripType,
        departureDate,
        returnDate,
        travelerCount,
        currency,
        flightCabin,
        flightProvider,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Flight search failed." }, { status: 500 });
  }
}
