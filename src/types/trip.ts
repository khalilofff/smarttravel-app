export type ActivityCategory =
  | "Culture"
  | "History"
  | "Food"
  | "Nature"
  | "Adventure"
  | "Nightlife"
  | "Art"
  | "Shopping"
  | "Photography"
  | "Wellness"
  | "Architecture"
  | "Beach";

export type TravelStyle = "Budget" | "Moderate" | "Comfort" | "Luxury";
export type TravelPace = "Relaxed" | "Moderate" | "Fast";
export type BestTimeOfDay = "Morning" | "Afternoon" | "Evening" | "Night" | "Anytime";

export interface TripPlannerInput {
  destination: string;
  startDate: string;
  endDate: string;
  budgetUsd: number;
  travelers: number;
  travelStyle: TravelStyle;
  pace: TravelPace;
  interests: ActivityCategory[];
}

export interface TravelPlace {
  id: string;
  destination: string;
  name: string;
  category: ActivityCategory;
  estimatedPriceUsd: number;
  durationHours: number;
  shortDescription: string;
  bestTimeOfDay: BestTimeOfDay;
  tags: string[];
  travelStyleFit: TravelStyle[];
  paceFit: TravelPace[];
  indoorOutdoor: "Indoor" | "Outdoor" | "Mixed";
  latitude: number;
  longitude: number;
  popularityScore: number;
  rating: number;
}

export interface ItineraryActivity {
  time: string;
  name: string;
  category: ActivityCategory;
  description: string;
  estimatedCostUsd: number;
  durationHours: number;
  whyRecommended: string;
  aiScore: number;
  latitude?: number;
  longitude?: number;
}

export interface ItineraryDay {
  day: number;
  date: string;
  title: string;
  estimatedCostUsd: number;
  activities: ItineraryActivity[];
}

export interface TripItinerary {
  summary: string;
  source: "ollama-llm" | "local-embedding" | "local-rule-based-fallback";
  aiMethod: string;
  estimatedTotalCostUsd: number;
  budgetComment: string;
  days: ItineraryDay[];
  tips: string[];
  warning?: string;
}
