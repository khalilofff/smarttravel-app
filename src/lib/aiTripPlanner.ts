import { allTravelPlaces } from "@/data";
import { type ScoredTravelPlace, scoreRuleBased } from "@/lib/tripScoring";
import { enhanceItineraryWithOllama } from "@/lib/ollamaProvider";
import type { ActivityCategory, ItineraryActivity, ItineraryDay, TravelPace, TravelPlace, TravelStyle, TripItinerary, TripPlannerInput } from "@/types/trip";

function normalizeCategory(category: string): ActivityCategory | null {
  const map: Record<string, ActivityCategory> = {
    culture: "Culture",
    history: "History",
    food: "Food",
    nature: "Nature",
    adventure: "Adventure",
    nightlife: "Nightlife",
    art: "Art",
    shopping: "Shopping",
    photography: "Photography",
    wellness: "Wellness",
    architecture: "Architecture",
    beach: "Beach",
  };
  return map[category.toLowerCase()] || null;
}

function normalizeStyle(style: string): TravelStyle {
  const value = style.toLowerCase();
  if (value.includes("budget") || value.includes("backpacker")) return "Budget";
  if (value.includes("luxury")) return "Luxury";
  if (value.includes("comfort") || value.includes("family") || value.includes("relaxation")) return "Comfort";
  return "Moderate";
}

function normalizePace(pace: string): TravelPace {
  const value = pace.toLowerCase();
  if (value.includes("slow") || value.includes("relax")) return "Relaxed";
  if (value.includes("fast") || value.includes("packed")) return "Fast";
  return "Moderate";
}

export function normalizePlannerInput(raw: any): TripPlannerInput {
  const interests = (raw.interests || [])
    .map((x: string) => normalizeCategory(String(x)))
    .filter(Boolean) as ActivityCategory[];
  const input: TripPlannerInput = {
    destination: String(raw.destination || "").trim(),
    startDate: String(raw.startDate || ""),
    endDate: String(raw.endDate || ""),
    budgetUsd: Number(raw.budgetUsd ?? raw.budget ?? raw.totalBudget ?? 1000),
    travelers: Math.max(1, Number(raw.travelers ?? raw.travelerCount ?? 1)),
    travelStyle: normalizeStyle(String(raw.travelStyle || "Moderate")),
    pace: normalizePace(String(raw.pace || "Moderate")),
    interests: interests.length ? interests : ["Culture", "Food"],
  };
  validatePlannerInput(input);
  return input;
}

function validatePlannerInput(input: TripPlannerInput) {
  if (!input.destination) throw new Error("Destination is required");
  if (!input.startDate || !input.endDate) throw new Error("Start and end dates are required");
  const start = new Date(input.startDate);
  const end = new Date(input.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new Error("Invalid trip dates");
  if (end < start) throw new Error("End date must be after start date");
  if (!Number.isFinite(input.budgetUsd) || input.budgetUsd <= 0) throw new Error("Budget must be greater than zero");
}

function getTripDates(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(startDate);
  const end = new Date(endDate);
  while (cursor <= end && dates.length < 30) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates.length ? dates : [startDate];
}

function slotsForPace(pace: TravelPace): number {
  if (pace === "Relaxed") return 3;
  if (pace === "Fast") return 5;
  return 4;
}

function timeSlotsFor(count: number): string[] {
  const slots = ["09:30", "11:30", "14:00", "17:00", "20:30"];
  return slots.slice(0, count);
}

function destinationMatches(place: TravelPlace, destination: string) {
  return place.destination.toLowerCase() === destination.toLowerCase();
}

function reserveInterestCoverage(scored: ScoredTravelPlace[], interests: ActivityCategory[]): ScoredTravelPlace[] {
  const used = new Set<string>();
  const selected: ScoredTravelPlace[] = [];
  for (const interest of interests) {
    const direct = scored.find((p) => !used.has(p.id) && p.category === interest);
    const tag = scored.find((p) => !used.has(p.id) && p.tags.some((t) => t.toLowerCase().includes(interest.toLowerCase())));
    const match = direct || tag;
    if (match) {
      used.add(match.id);
      selected.push(match);
    }
  }
  for (const place of scored) {
    if (!used.has(place.id)) selected.push(place);
  }
  return selected;
}

function asActivity(place: ScoredTravelPlace, time: string): ItineraryActivity {
  return {
    time,
    name: place.name,
    category: place.category,
    description: place.shortDescription,
    estimatedCostUsd: place.estimatedPriceUsd,
    durationHours: place.durationHours,
    whyRecommended: `Recommended because it matches ${place.category} preferences, fits ${place.travelStyleFit.join("/")} travel style and scored ${(place.aiScore * 100).toFixed(0)}% in the local AI ranking.`,
    aiScore: place.aiScore,
    latitude: place.latitude,
    longitude: place.longitude,
  };
}

function distribute(input: TripPlannerInput, ranked: ScoredTravelPlace[]): ItineraryDay[] {
  const dates = getTripDates(input.startDate, input.endDate);
  const perDay = slotsForPace(input.pace);
  const totalNeeded = dates.length * perDay;
  const chosen = reserveInterestCoverage(ranked, input.interests).slice(0, totalNeeded);
  return dates.map((date, dayIndex) => {
    const dayPlaces = chosen.slice(dayIndex * perDay, (dayIndex + 1) * perDay);
    const times = timeSlotsFor(dayPlaces.length);
    const activities = dayPlaces.map((place, idx) => asActivity(place, times[idx] || "10:00"));
    return {
      day: dayIndex + 1,
      date,
      title: dayIndex === 0 ? `${input.destination} essentials` : `${input.destination} day ${dayIndex + 1}`,
      estimatedCostUsd: activities.reduce((sum, item) => sum + item.estimatedCostUsd, 0) * input.travelers,
      activities,
    };
  });
}

function budgetComment(total: number, budget: number): string {
  if (total <= budget * 0.8) return "This plan stays comfortably under your budget.";
  if (total <= budget) return "This plan fits your budget with a small safety margin.";
  return "This plan is slightly over budget; reduce paid activities or choose Budget style if needed.";
}

async function rankPlaces(input: TripPlannerInput): Promise<ScoredTravelPlace[]> {
  const destinationPlaces = allTravelPlaces.filter((place) => destinationMatches(place, input.destination));
  const places = destinationPlaces.length ? destinationPlaces : allTravelPlaces;
  return scoreRuleBased(input, places);
}

function buildBaseItinerary(input: TripPlannerInput, ranked: ScoredTravelPlace[]): TripItinerary {
  const days = distribute(input, ranked);
  const estimatedTotalCostUsd = Math.round(days.reduce((sum, day) => sum + day.estimatedCostUsd, 0));
  return {
    summary: `${input.destination} itinerary generated from local/Geoapify places with selected interests: ${input.interests.join(", ")}.`,
    source: "local-rule-based-fallback",
    aiMethod: "Local place data + budget/interest scoring fallback",
    estimatedTotalCostUsd,
    budgetComment: budgetComment(estimatedTotalCostUsd, input.budgetUsd),
    days,
    tips: [
      "Start popular attractions early to avoid queues.",
      "Keep a small buffer between activities for transport and rest.",
      "Prices are local estimates and can change by season.",
    ],
  };
}

export async function generateAITripItinerary(rawInput: unknown): Promise<TripItinerary> {
  const input = normalizePlannerInput(rawInput);
  const ranked = await rankPlaces(input);
  const base = buildBaseItinerary(input, ranked);

  try {
    const ollamaItinerary = await enhanceItineraryWithOllama(input, base);
    if (process.env.NODE_ENV === "development") {
      console.log("[ollama-trip-planner] selected interests", input.interests);
      console.log("[ollama-trip-planner] generated categories", ollamaItinerary.days.flatMap((d) => d.activities.map((a) => a.category)));
      console.log("[ollama-trip-planner] source", ollamaItinerary.source);
      console.log("[ollama-trip-planner] aiMethod", ollamaItinerary.aiMethod);
    }
    return ollamaItinerary;
  } catch (error) {
    console.warn("Ollama local LLM failed, using local scoring fallback:", error);
    return {
      ...base,
      warning: "Ollama local LLM was unavailable or failed. Used local scoring fallback. Make sure Ollama is running and the model is pulled.",
    };
  }
}
