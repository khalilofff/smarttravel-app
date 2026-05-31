import type { ActivityCategory, TravelPlace } from "@/types/trip";

type CityInfo = { country: string; lat: number; lon: number; theme: string };

const cities: Record<string, CityInfo> = {
  Istanbul: { country: "Turkey", lat: 41.0082, lon: 28.9784, theme: "Ottoman heritage, bazaars, Bosphorus views and rich food culture" },
  Amsterdam: { country: "Netherlands", lat: 52.3676, lon: 4.9041, theme: "canals, museums, cycling culture and lively evening districts" },
  Paris: { country: "France", lat: 48.8566, lon: 2.3522, theme: "art, architecture, historic boulevards, cuisine and romantic river walks" },
  Rome: { country: "Italy", lat: 41.9028, lon: 12.4964, theme: "ancient history, piazzas, churches, Roman ruins and trattoria food" },
  Barcelona: { country: "Spain", lat: 41.3874, lon: 2.1686, theme: "Gaudí architecture, beaches, tapas, markets and Mediterranean nightlife" },
  London: { country: "United Kingdom", lat: 51.5072, lon: -0.1276, theme: "royal landmarks, museums, theatre, shopping and diverse neighborhoods" },
  Tokyo: { country: "Japan", lat: 35.6762, lon: 139.6503, theme: "temples, neon districts, food markets, shopping and futuristic city scenes" },
  "New York": { country: "United States", lat: 40.7128, lon: -74.006, theme: "skyline views, museums, Broadway, parks, food halls and shopping" },
  Cappadocia: { country: "Turkey", lat: 38.6431, lon: 34.8289, theme: "fairy chimneys, cave villages, balloons, valleys and photography" },
  Antalya: { country: "Turkey", lat: 36.8969, lon: 30.7133, theme: "beaches, old town, waterfalls, wellness resorts and Mediterranean nature" },
};

const templates: Record<ActivityCategory, { n: string; d: string; price: number; hours: number; time: TravelPlace["bestTimeOfDay"]; indoorOutdoor: TravelPlace["indoorOutdoor"]; tags: string[] }[]> = {
  Food: [
    { n: "Local Food Market Tasting", d: "Taste signature street food and regional dishes with a flexible self-guided food walk.", price: 24, hours: 1.5, time: "Afternoon", indoorOutdoor: "Mixed", tags: ["food", "market", "local"] },
    { n: "Traditional Dinner Experience", d: "A relaxed restaurant stop focused on classic local flavors and neighborhood atmosphere.", price: 38, hours: 2, time: "Evening", indoorOutdoor: "Indoor", tags: ["dinner", "restaurant", "local cuisine"] },
  ],
  Nightlife: [
    { n: "Evening District Walk", d: "Explore the most active evening area with bars, music streets and safe photo stops.", price: 22, hours: 2.5, time: "Night", indoorOutdoor: "Mixed", tags: ["nightlife", "music", "evening"] },
    { n: "Rooftop or Live Music Night", d: "A comfortable night plan with skyline views or local live music depending on the city.", price: 45, hours: 2.5, time: "Night", indoorOutdoor: "Indoor", tags: ["bar", "music", "views"] },
  ],
  Culture: [
    { n: "Signature Culture Museum", d: "Visit a major museum or cultural institution that explains the city's identity.", price: 18, hours: 2, time: "Morning", indoorOutdoor: "Indoor", tags: ["museum", "culture", "heritage"] },
    { n: "Local Neighborhood Culture Walk", d: "Walk through a characterful district with local stories, cafés and everyday culture.", price: 0, hours: 2, time: "Afternoon", indoorOutdoor: "Outdoor", tags: ["culture", "walking", "local life"] },
  ],
  History: [
    { n: "Old Town History Route", d: "See the historic core, landmarks and stories that shaped the destination.", price: 12, hours: 2.5, time: "Morning", indoorOutdoor: "Outdoor", tags: ["history", "old town", "heritage"] },
    { n: "Historic Monument Visit", d: "A focused visit to one of the city's most important historical monuments.", price: 15, hours: 1.5, time: "Afternoon", indoorOutdoor: "Mixed", tags: ["monument", "history", "architecture"] },
  ],
  Nature: [
    { n: "Scenic Park and Viewpoint", d: "Recharge in a green area with viewpoints, easy walking paths and local scenery.", price: 0, hours: 2, time: "Afternoon", indoorOutdoor: "Outdoor", tags: ["nature", "park", "views"] },
    { n: "Waterfront or Valley Walk", d: "A nature-focused walk using the city's best waterfront, valley or natural route.", price: 0, hours: 2.5, time: "Morning", indoorOutdoor: "Outdoor", tags: ["nature", "walking", "photography"] },
  ],
  Adventure: [
    { n: "Active City Adventure", d: "A higher-energy activity such as biking, boat touring, hiking or guided adventure route.", price: 55, hours: 3, time: "Morning", indoorOutdoor: "Outdoor", tags: ["adventure", "active", "tour"] },
    { n: "Outdoor Guided Experience", d: "A guided outdoor experience designed for travelers who want movement and discovery.", price: 70, hours: 3, time: "Afternoon", indoorOutdoor: "Outdoor", tags: ["guided", "adventure", "outdoor"] },
  ],
  Art: [
    { n: "Art Gallery Highlight", d: "Visit a respected gallery or art space featuring classic or contemporary works.", price: 16, hours: 1.5, time: "Afternoon", indoorOutdoor: "Indoor", tags: ["art", "gallery", "creative"] },
    { n: "Street Art and Creative Quarter", d: "Explore murals, design shops and creative streets with strong photo potential.", price: 0, hours: 2, time: "Afternoon", indoorOutdoor: "Outdoor", tags: ["street art", "creative", "photography"] },
  ],
  Shopping: [
    { n: "Main Shopping Avenue", d: "A curated shopping walk through the city's best-known retail street or district.", price: 30, hours: 2, time: "Afternoon", indoorOutdoor: "Mixed", tags: ["shopping", "fashion", "souvenirs"] },
    { n: "Local Bazaar or Design Market", d: "Find crafts, gifts, local design and specialty products in a lively market setting.", price: 20, hours: 1.5, time: "Morning", indoorOutdoor: "Mixed", tags: ["market", "shopping", "local"] },
  ],
  Photography: [
    { n: "Golden Hour Photo Route", d: "A route planned around the most photogenic streets, viewpoints and landmarks.", price: 0, hours: 2, time: "Evening", indoorOutdoor: "Outdoor", tags: ["photography", "golden hour", "views"] },
    { n: "Iconic Landmark Photo Stop", d: "A short but high-value stop at a recognizable viewpoint or landmark angle.", price: 0, hours: 1, time: "Morning", indoorOutdoor: "Outdoor", tags: ["photo", "landmark", "instagram"] },
  ],
  Wellness: [
    { n: "Spa and Wellness Break", d: "Slow down with a spa, hammam, bathhouse or wellness treatment matched to the destination.", price: 65, hours: 2, time: "Afternoon", indoorOutdoor: "Indoor", tags: ["wellness", "spa", "relaxation"] },
    { n: "Calm Morning Reset", d: "A peaceful start with a garden, seaside path, yoga-friendly stop or quiet café.", price: 12, hours: 1.5, time: "Morning", indoorOutdoor: "Mixed", tags: ["relaxed", "wellness", "calm"] },
  ],
  Architecture: [
    { n: "Architecture Icons Walk", d: "A walk connecting the city's strongest architectural highlights and design stories.", price: 10, hours: 2, time: "Morning", indoorOutdoor: "Outdoor", tags: ["architecture", "design", "landmarks"] },
    { n: "Historic Building Interior", d: "Explore a beautiful interior, palace, cathedral, station or civic building.", price: 14, hours: 1.5, time: "Afternoon", indoorOutdoor: "Indoor", tags: ["architecture", "interior", "history"] },
  ],
  Beach: [
    { n: "Beach Time and Promenade", d: "Relax at the best accessible beach area with a scenic walk and optional café stop.", price: 0, hours: 3, time: "Afternoon", indoorOutdoor: "Outdoor", tags: ["beach", "sea", "relaxation"] },
    { n: "Sunset Coast Stop", d: "A low-effort sunset plan near water with photo and dinner options nearby.", price: 0, hours: 2, time: "Evening", indoorOutdoor: "Outdoor", tags: ["sunset", "beach", "photography"] },
  ],
};

const budgetStyles = ["Budget", "Moderate"] as const;
const midStyles = ["Budget", "Moderate", "Comfort"] as const;
const allStyles = ["Budget", "Moderate", "Comfort", "Luxury"] as const;

function styleFit(price: number): TravelPlace["travelStyleFit"] {
  if (price <= 15) return [...budgetStyles];
  if (price <= 45) return [...midStyles];
  return [...allStyles].filter((s) => s !== "Budget") as TravelPlace["travelStyleFit"];
}

function paceFit(hours: number): TravelPlace["paceFit"] {
  if (hours <= 1.5) return ["Moderate", "Fast"];
  if (hours <= 2.5) return ["Relaxed", "Moderate", "Fast"];
  return ["Relaxed", "Moderate"];
}

export const travelData: TravelPlace[] = Object.entries(cities).flatMap(([destination, city]) => {
  const categories = Object.keys(templates) as ActivityCategory[];
  return categories.flatMap((category, categoryIndex) =>
    templates[category].map((tpl, itemIndex) => ({
      id: `${destination.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${category.toLowerCase()}-${itemIndex + 1}`,
      destination,
      name: `${destination} ${tpl.n}`,
      category,
      estimatedPriceUsd: tpl.price,
      durationHours: tpl.hours,
      shortDescription: `${tpl.d} Best for ${city.theme}.`,
      bestTimeOfDay: tpl.time,
      tags: [...tpl.tags, city.country.toLowerCase(), destination.toLowerCase()],
      travelStyleFit: styleFit(tpl.price),
      paceFit: paceFit(tpl.hours),
      indoorOutdoor: tpl.indoorOutdoor,
      latitude: Number((city.lat + (categoryIndex - 5) * 0.006 + itemIndex * 0.003).toFixed(6)),
      longitude: Number((city.lon + (categoryIndex - 5) * 0.006 - itemIndex * 0.003).toFixed(6)),
      popularityScore: Math.min(96, 72 + categoryIndex + itemIndex * 4),
      rating: Number((4.2 + ((categoryIndex + itemIndex) % 7) * 0.08).toFixed(1)),
    }))
  );
});
