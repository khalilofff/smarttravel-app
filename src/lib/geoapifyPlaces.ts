type GeoPlace = {
  name: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  source: "geoapify";
};

async function geocodeDestination(destination: string, apiKey: string) {
  const params = new URLSearchParams({
    text: destination,
    limit: "1",
    apiKey,
  });

  const url = "https://api.geoapify.com/v1/geocode/search?" + params.toString();

  const res = await fetch(url);

  if (!res.ok) {
    const err = await res.text();
    console.error("Geoapify geocode failed:", res.status, err);
    return null;
  }

  const data = await res.json();
  const first = data.features?.[0];

  if (!first?.properties?.lat || !first?.properties?.lon) {
    console.warn("Geoapify geocode returned no coordinates for:", destination);
    return null;
  }

  return {
    lat: first.properties.lat,
    lon: first.properties.lon,
  };
}

export async function fetchGeoapifyPlaces(destination: string): Promise<GeoPlace[]> {
  const apiKey = process.env.GEOAPIFY_API_KEY;

  if (!apiKey) {
    console.warn("Geoapify API key missing");
    return [];
  }

  console.log("🌍 Geoapify geocoding:", destination);

  const coords = await geocodeDestination(destination, apiKey);

  if (!coords) return [];

  const params = new URLSearchParams({
    categories:
      "tourism,tourism.sights,catering,catering.restaurant,entertainment,leisure,commercial",
    bias: `proximity:${coords.lon},${coords.lat}`,
    limit: "40",
    apiKey,
  });

  const url = "https://api.geoapify.com/v2/places?" + params.toString();

  console.log("🌍 Geoapify places near:", coords.lat, coords.lon);

  const response = await fetch(url);

  if (!response.ok) {
    const err = await response.text();
    console.error("Geoapify places failed:", response.status, err);
    return [];
  }

  const data = await response.json();

  return (data.features || [])
    .filter((item: any) => item.properties?.name)
    .map((item: any) => ({
      name: item.properties.name,
      category: item.properties.categories?.[0] || "Place",
      address: item.properties.formatted || "",
      latitude: item.properties.lat,
      longitude: item.properties.lon,
      source: "geoapify",
    }));
}