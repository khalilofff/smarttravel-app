import type { TripItinerary, TripPlannerInput } from "@/types/trip";
import { fetchGeoapifyPlaces } from "./geoapifyPlaces";
import { fetchFoursquarePlaces } from "./foursquarePlaces";

const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434";
const DEFAULT_OLLAMA_MODEL = "llama3.2";

type OllamaGenerateResponse = { response?: string; done?: boolean };

function getOllamaBaseUrl() {
  return (process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL).replace(/\/$/, "");
}

export function getOllamaModel() {
  return process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL;
}

async function ollamaGenerate(prompt: string): Promise<string> {
  console.log("🔥 OLLAMA REQUEST GEDDI");
  console.log("🤖 Model:", getOllamaModel());
  console.log("🌐 URL:", getOllamaBaseUrl() + "/api/generate");

  const response = await fetch(getOllamaBaseUrl() + "/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: getOllamaModel(),
      prompt,
      stream: false,
      format: "json",
      options: {
        temperature: 0.85,
        top_p: 0.95,
      },
    }),
  });

  console.log("📡 OLLAMA HTTP STATUS:", response.status);

  if (!response.ok) {
    throw new Error("Ollama request failed with HTTP " + response.status);
  }

  const data = (await response.json()) as OllamaGenerateResponse;

  console.log("✅ OLLAMA RESPONSE GELDI");
  console.log("🧠 Response length:", data.response?.length || 0);

  if (!data.response) {
    throw new Error("Ollama returned an empty response");
  }

  return data.response;
}

function parseJsonObject(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Ollama response did not contain JSON");
    return JSON.parse(match[0]);
  }
}

function dedupePlaces(places: any[]) {
  return places.filter(
    (place, index, self) =>
      place?.name &&
      index ===
        self.findIndex(
          (p) =>
            String(p.name).toLowerCase().trim() ===
            String(place.name).toLowerCase().trim()
        )
  );
}

async function fetchInternetPlaces(input: TripPlannerInput) {
  console.log("🌍 Fetching internet places for:", input.destination);
  console.log("🎯 Travel style:", input.travelStyle);

  const geoapifyPlaces = await fetchGeoapifyPlaces(input.destination);

  console.log("🌍 GEOAPIFY PLACES:", geoapifyPlaces.length);

  const foursquarePlaces = await fetchFoursquarePlaces(
    input.destination,
    input.travelStyle
  );

  console.log("📍 FOURSQUARE PLACES:", foursquarePlaces.length);

  let places = [...geoapifyPlaces, ...foursquarePlaces];

  places = dedupePlaces(places).slice(0, 50);

  console.log("✅ TOTAL PLACES FOR AI:", places.length);

  return places;
}

function estimateCostByStyle(
  category: string,
  travelStyle: string,
  aiCost: number
) {
  const style = String(travelStyle || "").toLowerCase();
  const cat = String(category || "").toLowerCase();

  if (style.includes("luxury")) {
    if (!aiCost || aiCost < 50) aiCost = 50;

    if (
      cat.includes("food") ||
      cat.includes("restaurant") ||
      cat.includes("fine")
    ) {
      return Math.max(aiCost, 70);
    }

    if (
      cat.includes("tour") ||
      cat.includes("experience") ||
      cat.includes("private")
    ) {
      return Math.max(aiCost, 90);
    }

    if (
      cat.includes("wellness") ||
      cat.includes("spa") ||
      cat.includes("hotel")
    ) {
      return Math.max(aiCost, 100);
    }

    if (
      cat.includes("shopping") ||
      cat.includes("entertainment") ||
      cat.includes("luxury")
    ) {
      return Math.max(aiCost, 80);
    }

    return Math.max(aiCost, 50);
  }

  if (style.includes("budget")) {
    if (
      cat.includes("food") ||
      cat.includes("restaurant") ||
      cat.includes("cafe")
    ) {
      return Math.min(Math.max(aiCost, 5), 12);
    }

    if (
      cat.includes("museum") ||
      cat.includes("culture") ||
      cat.includes("history")
    ) {
      return Math.min(Math.max(aiCost, 0), 15);
    }

    return Math.min(Math.max(aiCost, 0), 15);
  }

  if (style.includes("backpacker")) {
    if (
      cat.includes("food") ||
      cat.includes("restaurant") ||
      cat.includes("cafe")
    ) {
      return Math.min(Math.max(aiCost, 5), 15);
    }

    return Math.min(Math.max(aiCost, 0), 18);
  }

  if (style.includes("adventure")) {
    if (
      cat.includes("tour") ||
      cat.includes("adventure") ||
      cat.includes("boat") ||
      cat.includes("outdoor") ||
      cat.includes("nature")
    ) {
      return Math.max(aiCost, 25);
    }

    return Math.max(aiCost, 10);
  }

  if (style.includes("family")) {
    return Math.min(Math.max(aiCost, 5), 35);
  }

  if (style.includes("cultural")) {
    if (
      cat.includes("museum") ||
      cat.includes("history") ||
      cat.includes("culture")
    ) {
      return Math.min(Math.max(aiCost, 5), 30);
    }

    return Math.min(Math.max(aiCost, 5), 35);
  }

  return Math.min(Math.max(aiCost, 5), 30);
}

function buildPrompt(input: TripPlannerInput, places: any[]) {
  return [
    "You are an intelligent AI travel planner inside SmartTravel.",
    "",
    "Create a fresh FULL travel itinerary based on the user's input.",
    "",
    "Trip details:",
    "Destination: " + input.destination,
    "Start date: " + input.startDate,
    "End date: " + input.endDate,
    "Budget USD: " + input.budgetUsd,
    "Travelers: " + input.travelers,
    "Travel style: " + input.travelStyle,
    "Pace: " + input.pace,
    "Selected interests: " + input.interests.join(", "),
    "",
    "Real places fetched from internet APIs:",
    JSON.stringify(places),
    "",
    "Rules:",
    "- Prefer places from the provided internet places list.",
    "- If places are available, do not invent fake place names.",
    "- Use latitude and longitude from the provided places when possible.",
    "- You may reorder and combine places into a realistic travel flow.",
    "- Do not return the exact same itinerary every time.",
    "- Each generation should feel fresh and different.",
    "- If pace is moderate, create a balanced plan: not too crowded, not too empty.",
    "- Each day should have 3 to 5 activities.",
    "",
    "Travel style rules:",
    "- Budget: choose free/cheap museums, parks, walking routes, street food and public places. Activity costs should mostly be 0–10 USD.",
    "- Moderate: choose balanced restaurants, famous attractions, museums, scenic places and local experiences. Activity costs should mostly be 5–25 USD.",
    "- Luxury: choose premium restaurants, rooftop lounges, luxury hotel restaurants, private tours, spa/wellness experiences, fine dining, yacht/boat experiences, VIP cultural visits and elegant scenic spots. Activity costs should mostly be 40–150 USD.",
    "- Backpacker: choose hostel areas, walking tours, cheap local food, public transport friendly attractions and free places. Activity costs should mostly be 0–15 USD.",
    "- Family: choose safe, relaxed, child-friendly attractions, parks, museums, aquariums, family restaurants and easy routes. Activity costs should mostly be 5–30 USD.",
    "- Adventure: choose hiking, viewpoints, boat trips, nature activities, outdoor experiences and adrenaline activities. Activity costs should mostly be 10–60 USD.",
    "- Cultural: choose museums, historical sites, old towns, heritage places, traditional food and galleries. Activity costs should mostly be 5–30 USD.",
    "",
    "Luxury-specific rules:",
    "- If Travel style is Luxury, DO NOT suggest cheap street food, free walking routes, basic public parks or low-budget places unless they are iconic premium landmarks.",
    "- If Travel style is Luxury, prefer high-end, elegant, exclusive, premium and reservation-worthy places.",
    "- If Travel style is Luxury, restaurants must cost at least 50 USD per person.",
    "- If Travel style is Luxury, tours/experiences must cost at least 75 USD.",
    "- If Travel style is Luxury, spas/wellness/yacht/private experiences must cost 80–200 USD.",
    "- If Travel style is Luxury, estimatedCostUsd for most activities should NOT be 0, 5, 10 or 15.",
    "",
    "Cost rules:",
    "- Do NOT assign 0 USD unless the place is truly free.",
    "- Restaurants should cost between 10–25 USD for Budget/Moderate, but 50–150 USD for Luxury.",
    "- Museums and paid attractions should cost between 5–20 USD for Budget/Moderate, but 20–60 USD for Luxury/VIP experiences.",
    "- Tours and experiences should cost between 15–50 USD normally, but 75–200 USD for Luxury.",
    "- Shopping and entertainment should cost at least 10 USD normally, but at least 50 USD for Luxury.",
    "- Always provide realistic estimatedCostUsd values based on the selected travel style.",
    "",
    "- Return JSON only. Do not add markdown or explanation.",
    "",
    "Required JSON shape:",
    "{",
    '  "summary": "string",',
    '  "budgetComment": "string",',
    '  "days": [',
    "    {",
    '      "day": 1,',
    '      "date": "YYYY-MM-DD",',
    '      "title": "string",',
    '      "estimatedCostUsd": 0,',
    '      "activities": [',
    "        {",
    '          "time": "09:30",',
    '          "name": "real place name",',
    '          "category": "Culture/Food/Nature/History/Shopping/Entertainment/Luxury/Wellness/Fine Dining/Private Tour",',
    '          "description": "string",',
    '          "estimatedCostUsd": 0,',
    '          "durationHours": 2,',
    '          "whyRecommended": "string",',
    '          "aiScore": 0.9,',
    '          "latitude": 0,',
    '          "longitude": 0',
    "        }",
    "      ]",
    "    }",
    "  ],",
    '  "tips": ["string"]',
    "}",
  ].join("\n");
}

function normalizeAiItinerary(
  base: TripItinerary,
  ai: any,
  input: TripPlannerInput
): TripItinerary {
  const aiDays = Array.isArray(ai?.days) ? ai.days : [];

  return {
    ...base,
    source: "ollama-llm",
    aiMethod:
      "Geoapify + Foursquare internet data + Smart price engine + Ollama local LLM (" +
      getOllamaModel() +
      ")",
    summary: typeof ai?.summary === "string" ? ai.summary : base.summary,
    budgetComment:
      typeof ai?.budgetComment === "string"
        ? ai.budgetComment
        : base.budgetComment,
    days: aiDays.length
      ? aiDays.map((day: any, dayIndex: number) => {
          const activities = Array.isArray(day?.activities)
            ? day.activities.map((activity: any, activityIndex: number) => {
                const category =
                  typeof activity?.category === "string"
                    ? activity.category
                    : "Place";

                const rawCost =
                  typeof activity?.estimatedCostUsd === "number"
                    ? activity.estimatedCostUsd
                    : 0;

                return {
                  id: `ollama-${dayIndex + 1}-${activityIndex + 1}`,
                  time:
                    typeof activity?.time === "string"
                      ? activity.time
                      : "09:30",
                  name:
                    typeof activity?.name === "string"
                      ? activity.name
                      : "AI Suggested Place",
                  category,
                  description:
                    typeof activity?.description === "string"
                      ? activity.description
                      : "",
                  estimatedCostUsd: estimateCostByStyle(
                    category,
                    input.travelStyle,
                    rawCost
                  ),
                  durationHours:
                    typeof activity?.durationHours === "number"
                      ? activity.durationHours
                      : 2,
                  whyRecommended:
                    typeof activity?.whyRecommended === "string"
                      ? activity.whyRecommended
                      : "Recommended by AI based on your trip preferences.",
                  aiScore:
                    typeof activity?.aiScore === "number"
                      ? activity.aiScore
                      : 0.9,
                  latitude:
                    typeof activity?.latitude === "number"
                      ? activity.latitude
                      : 0,
                  longitude:
                    typeof activity?.longitude === "number"
                      ? activity.longitude
                      : 0,
                  source: "ollama-llm",
                  crowdLevel: "Medium",
                };
              })
            : [];

          const totalDayCost = activities.reduce(
            (sum: number, activity: any) =>
              sum + Number(activity.estimatedCostUsd || 0),
            0
          );

          return {
            ...base.days[dayIndex],
            day: typeof day?.day === "number" ? day.day : dayIndex + 1,
            date:
              typeof day?.date === "string"
                ? day.date
                : base.days[dayIndex]?.date,
            title:
              typeof day?.title === "string"
                ? day.title
                : base.days[dayIndex]?.title || "AI Travel Day",
            estimatedCostUsd: totalDayCost,
            activities,
          };
        })
      : base.days,
    tips:
      Array.isArray(ai?.tips) && ai.tips.length
        ? ai.tips.map(String).slice(0, 6)
        : base.tips,
    warning: undefined,
  } as TripItinerary;
}

export async function enhanceItineraryWithOllama(
  input: TripPlannerInput,
  base: TripItinerary
): Promise<TripItinerary> {
  const places = await fetchInternetPlaces(input);

  const raw = await ollamaGenerate(buildPrompt(input, places));
  const ai = parseJsonObject(raw);

  return normalizeAiItinerary(base, ai, input);
}