import fs from "node:fs";
import path from "node:path";
import type { ActivityCategory, TravelPlace, TravelStyle, TravelPace } from "../src/types/trip";

function loadEnvFile(file: string) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, value] = match;
    if (!process.env[key]) process.env[key] = value.replace(/^['"]|['"]$/g, "");
  }
}

loadEnvFile(path.join(process.cwd(), ".env.local"));
loadEnvFile(path.join(process.cwd(), ".env"));

const apiKey = process.env.GEOAPIFY_API_KEY;
if (!apiKey) {
  console.error("Missing GEOAPIFY_API_KEY. Add it to .env.local first.");
  process.exit(1);
}

const destinations: Record<string, { lat: number; lon: number }> = {
  Istanbul: { lat: 41.0082, lon: 28.9784 },
  Amsterdam: { lat: 52.3676, lon: 4.9041 },
  Paris: { lat: 48.8566, lon: 2.3522 },
  Rome: { lat: 41.9028, lon: 12.4964 },
  Barcelona: { lat: 41.3874, lon: 2.1686 },
  London: { lat: 51.5072, lon: -0.1276 },
  Tokyo: { lat: 35.6762, lon: 139.6503 },
  "New York": { lat: 40.7128, lon: -74.006 },
  Cappadocia: { lat: 38.6431, lon: 34.8289 },
  Antalya: { lat: 36.8969, lon: 30.7133 },
};

const categoryMap: Record<ActivityCategory, string[]> = {
  Culture: ["tourism.attraction", "entertainment.culture"],
  History: ["heritage", "tourism.sights"],
  Food: ["catering.restaurant", "catering.cafe"],
  Nature: ["natural", "leisure.park"],
  Adventure: ["sport", "tourism.attraction"],
  Nightlife: ["catering.bar", "entertainment.nightclub", "entertainment"],
  Art: ["entertainment.museum", "tourism.artwork"],
  Shopping: ["commercial", "commercial.shopping_mall"],
  Photography: ["tourism.sights", "tourism.attraction", "natural"],
  Wellness: ["leisure.spa", "health_and_beauty"],
  Architecture: ["tourism.sights", "building"],
  Beach: ["beach", "natural.beach"],
};

function hash(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = Math.imul(31, h) + value.charCodeAt(i) | 0;
  return Math.abs(h);
}

function priceFor(category: ActivityCategory, seed: string) {
  const h = hash(seed);
  const ranges: Record<ActivityCategory, [number, number]> = {
    Food: [15, 45], Nightlife: [20, 60], Culture: [0, 35], History: [0, 35], Art: [0, 35], Architecture: [0, 35],
    Nature: [0, 20], Beach: [0, 20], Photography: [0, 20], Wellness: [40, 120], Adventure: [30, 100], Shopping: [10, 80],
  };
  const [min, max] = ranges[category];
  return min + (h % (max - min + 1));
}

function durationFor(category: ActivityCategory, seed: string) {
  if (category === "Food") return 1.5;
  if (category === "Nightlife") return 2.5;
  if (["Culture", "History", "Art", "Architecture"].includes(category)) return 1.5 + (hash(seed) % 2) * 0.5;
  if (["Nature", "Beach", "Photography"].includes(category)) return 2 + (hash(seed) % 3) * 0.5;
  if (category === "Wellness") return 2;
  if (category === "Adventure") return 3;
  return 2;
}

function styleFit(price: number): TravelStyle[] {
  if (price <= 15) return ["Budget", "Moderate"];
  if (price <= 50) return ["Budget", "Moderate", "Comfort"];
  return ["Moderate", "Comfort", "Luxury"];
}

function paceFit(hours: number): TravelPace[] {
  return hours <= 1.5 ? ["Moderate", "Fast"] : hours <= 2.5 ? ["Relaxed", "Moderate", "Fast"] : ["Relaxed", "Moderate"];
}

async function fetchCategory(destination: string, lat: number, lon: number, category: ActivityCategory): Promise<TravelPlace[]> {
  const categories = categoryMap[category];
  const url = new URL("https://api.geoapify.com/v2/places");
  url.searchParams.set("categories", categories.join(","));
  url.searchParams.set("filter", `circle:${lon},${lat},12000`);
  url.searchParams.set("bias", `proximity:${lon},${lat}`);
  url.searchParams.set("limit", "10");
  url.searchParams.set("apiKey", apiKey || "");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geoapify request failed for ${destination}/${category}: ${res.status}`);
  const data = await res.json();
  const features = Array.isArray(data.features) ? data.features : [];
  return features
    .filter((f: any) => f?.properties?.name)
    .map((f: any): TravelPlace => {
      const props = f.properties;
      const name = String(props.name);
      const id = `geoapify-${destination}-${category}-${hash(name + props.place_id)}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const price = priceFor(category, id);
      const hours = durationFor(category, id);
      const h = hash(id);
      return {
        id,
        destination,
        name,
        category,
        estimatedPriceUsd: price,
        durationHours: hours,
        shortDescription: props.formatted ? `${name} near ${props.formatted}.` : `${name} is a real Geoapify place suggestion for ${destination}.`,
        bestTimeOfDay: category === "Nightlife" ? "Night" : category === "Food" ? "Evening" : "Anytime",
        tags: [category.toLowerCase(), ...(props.categories || []).slice(0, 4)],
        travelStyleFit: styleFit(price),
        paceFit: paceFit(hours),
        indoorOutdoor: ["Nature", "Beach", "Photography", "Architecture"].includes(category) ? "Outdoor" : "Mixed",
        latitude: Number(props.lat || f.geometry?.coordinates?.[1] || lat),
        longitude: Number(props.lon || f.geometry?.coordinates?.[0] || lon),
        popularityScore: 60 + (h % 36),
        rating: Number((4.1 + (h % 8) / 10).toFixed(1)),
      };
    });
}

function dedupe(places: TravelPlace[]) {
  const map = new Map<string, TravelPlace>();
  for (const place of places) {
    const key = `${place.destination}-${place.name}`.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!map.has(key)) map.set(key, place);
  }
  return [...map.values()];
}

async function main() {
  const categories = Object.keys(categoryMap) as ActivityCategory[];
  const all: TravelPlace[] = [];
  for (const [destination, coords] of Object.entries(destinations)) {
    for (const category of categories) {
      try {
        const results = await fetchCategory(destination, coords.lat, coords.lon, category);
        all.push(...results.slice(0, 5));
        console.log(`Imported ${results.length} ${category} places for ${destination}`);
      } catch (error) {
        console.warn(error instanceof Error ? error.message : error);
      }
    }
  }
  const output = dedupe(all);
  const target = path.join(process.cwd(), "src/data/generatedTravelData.ts");
  fs.writeFileSync(target, `import type { TravelPlace } from "@/types/trip";\n\nexport const generatedTravelData: TravelPlace[] = ${JSON.stringify(output, null, 2)};\n`);
  console.log(`Saved ${output.length} deduplicated places to src/data/generatedTravelData.ts`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
