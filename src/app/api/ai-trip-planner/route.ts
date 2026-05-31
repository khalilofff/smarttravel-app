import { NextRequest, NextResponse } from "next/server";
import { generateAITripItinerary } from "@/lib/aiTripPlanner";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const itinerary = await generateAITripItinerary(body);
    return NextResponse.json(itinerary);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate itinerary";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
