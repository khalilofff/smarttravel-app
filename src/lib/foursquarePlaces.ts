export async function fetchFoursquarePlaces(city: string, travelStyle?: string) {
  const apiKey = process.env.FOURSQUARE_API_KEY;

  if (!apiKey) {
    console.warn("Foursquare API key missing");
    return [];
  }

  const styleQueryMap: Record<string, string> = {
    Budget: "cheap food parks museums free attractions",
    Moderate: "restaurants museums attractions scenic places",
    Luxury: "fine dining rooftop spa luxury hotel private tour",
    Backpacker: "hostels walking tour cheap food public attractions",
    Family: "family attractions parks museums aquarium kid friendly",
    Adventure: "hiking outdoor adventure boat tour viewpoint",
    Cultural: "museums historical sites old town galleries traditional food",
  };

  const query =
    styleQueryMap[travelStyle || ""] || "tourist attractions restaurants";

  const params = new URLSearchParams({
    near: city,
    query,
    limit: "30",
  });

  const url =
    "https://places-api.foursquare.com/places/search?" + params.toString();

  console.log("📍 Foursquare request:", city, query);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
        "X-Places-Api-Version": "2025-06-17",
      },
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Foursquare error:", res.status, err);
      return [];
    }

    const data = await res.json();

    return (data.results || [])
      .filter((place: any) => place.name)
      .map((place: any) => ({
        name: place.name,
        category: place.categories?.[0]?.name || "Place",
        latitude:
          place.latitude ||
          place.geocodes?.main?.latitude ||
          place.location?.latitude,
        longitude:
          place.longitude ||
          place.geocodes?.main?.longitude ||
          place.location?.longitude,
        address:
          place.location?.formatted_address ||
          place.location?.address ||
          "",
        source: "foursquare",
      }));
  } catch (error) {
    console.error("Foursquare network failed, skipping:", error);
    return [];
  }
}