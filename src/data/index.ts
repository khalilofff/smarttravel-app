import type { TravelPlace } from "@/types/trip";
import { travelData } from "./travelData";
import { generatedTravelData } from "./generatedTravelData";

function key(place: Pick<TravelPlace, "destination" | "name">) {
  return `${place.destination}::${place.name}`.toLowerCase().replace(/[^a-z0-9:]+/g, " ").trim();
}

export function getAllTravelPlaces(): TravelPlace[] {
  const merged = new Map<string, TravelPlace>();
  for (const place of travelData) merged.set(key(place), place);
  for (const place of generatedTravelData || []) merged.set(key(place), place);
  return [...merged.values()];
}

export const allTravelPlaces = getAllTravelPlaces();
