import type { ActivityCategory, TravelPace, TravelPlace, TravelStyle, TripPlannerInput } from "@/types/trip";
import { cosineSimilarity } from "@/lib/vectorUtils";

type ScoreInput = {
  place: TravelPlace;
  input: TripPlannerInput;
  semanticSimilarity: number;
};

export type ScoredTravelPlace = TravelPlace & {
  aiScore: number;
  scoreBreakdown: {
    semanticSimilarity: number;
    interestMatch: number;
    budgetFit: number;
    styleFit: number;
    paceFit: number;
    ratingPopularity: number;
  };
};

function normalizeInterest(value: string): string {
  return value.toLowerCase().trim();
}

function interestMatch(place: TravelPlace, interests: ActivityCategory[]): number {
  if (!interests.length) return 0.55;
  const wanted = new Set(interests.map(normalizeInterest));
  if (wanted.has(normalizeInterest(place.category))) return 1;
  const tagHit = place.tags.some((tag) => wanted.has(normalizeInterest(tag)));
  return tagHit ? 0.75 : 0.2;
}

function budgetFit(place: TravelPlace, input: TripPlannerInput): number {
  const tripDays = Math.max(1, Math.ceil((new Date(input.endDate).getTime() - new Date(input.startDate).getTime()) / 86400000) + 1 || 1);
  const perActivityBudget = Math.max(10, input.budgetUsd / Math.max(1, input.travelers) / Math.max(1, tripDays * 3));
  if (place.estimatedPriceUsd <= perActivityBudget) return 1;
  const overRatio = place.estimatedPriceUsd / perActivityBudget;
  return Math.max(0.15, 1 / overRatio);
}

function styleFit(place: TravelPlace, travelStyle: TravelStyle): number {
  return place.travelStyleFit.includes(travelStyle) ? 1 : 0.35;
}

function paceFit(place: TravelPlace, pace: TravelPace): number {
  return place.paceFit.includes(pace) ? 1 : 0.4;
}

function ratingPopularity(place: TravelPlace): number {
  const rating = Math.max(0, Math.min(1, (place.rating - 3.5) / 1.5));
  const popularity = Math.max(0, Math.min(1, place.popularityScore / 100));
  return rating * 0.55 + popularity * 0.45;
}

export function buildUserQueryText(input: TripPlannerInput): string {
  return `A ${input.travelStyle} traveler visiting ${input.destination}, interested in ${input.interests.join(", ")}, prefers ${input.pace} pace, budget ${input.budgetUsd} USD for ${input.travelers} travelers, wants realistic travel activities.`;
}

export function scoreTravelPlace({ place, input, semanticSimilarity }: ScoreInput): ScoredTravelPlace {
  const normalizedSemantic = Math.max(0, Math.min(1, (semanticSimilarity + 1) / 2));
  const breakdown = {
    semanticSimilarity: normalizedSemantic,
    interestMatch: interestMatch(place, input.interests),
    budgetFit: budgetFit(place, input),
    styleFit: styleFit(place, input.travelStyle),
    paceFit: paceFit(place, input.pace),
    ratingPopularity: ratingPopularity(place),
  };
  const aiScore =
    breakdown.semanticSimilarity * 0.45 +
    breakdown.interestMatch * 0.20 +
    breakdown.budgetFit * 0.15 +
    breakdown.styleFit * 0.10 +
    breakdown.paceFit * 0.05 +
    breakdown.ratingPopularity * 0.05;
  return { ...place, aiScore: Number(aiScore.toFixed(4)), scoreBreakdown: breakdown };
}

export function scoreWithEmbeddings(input: TripPlannerInput, places: TravelPlace[], queryEmbedding: number[], placeEmbeddings: Map<string, number[]>): ScoredTravelPlace[] {
  return places
    .map((place) => scoreTravelPlace({ place, input, semanticSimilarity: cosineSimilarity(queryEmbedding, placeEmbeddings.get(place.id) || []) }))
    .sort((a, b) => b.aiScore - a.aiScore);
}

export function scoreRuleBased(input: TripPlannerInput, places: TravelPlace[]): ScoredTravelPlace[] {
  return places
    .map((place) => scoreTravelPlace({ place, input, semanticSimilarity: place.category === input.interests[0] ? 0.7 : 0.25 }))
    .sort((a, b) => b.aiScore - a.aiScore);
}
