"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Input, Card, CardContent, Badge, Select, EmptyState } from "@/components/ui";
import { Search, MapPin, Star, Compass, Loader2, ExternalLink, RefreshCw, Plus } from "lucide-react";
import toast from "react-hot-toast";

const CATEGORIES = ["All", "landmark", "museum", "food", "shopping", "park", "activity"];

type TripOption = { id: string; title: string; destinations?: Array<{ name: string; country: string }> };

export default function DestinationsPage() {
  const [destinations, setDestinations] = useState<any[]>([]);
  const [trips, setTrips] = useState<TripOption[]>([]);
  const [selectedTripId, setSelectedTripId] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sortBy, setSortBy] = useState("rating");
  const [apiStatus, setApiStatus] = useState("");
  const [message, setMessage] = useState("");
  const [activeDestination, setActiveDestination] = useState<any>(null);

  const loadTrips = useCallback(async () => {
    const res = await fetch("/api/trips", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    const rows = Array.isArray(data) ? data : [];
    setTrips(rows);
    if (!selectedTripId && rows[0]?.id) setSelectedTripId(rows[0].id);
  }, [selectedTripId]);

  const fetchDestinations = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const params = new URLSearchParams();
      if (selectedTripId) params.set("tripId", selectedTripId);
      if (search) params.set("search", search);
      if (category !== "All") params.set("category", category);
      params.set("sortBy", sortBy);
      const res = await fetch(`/api/destinations?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Live places could not be loaded");
      setDestinations(Array.isArray(data) ? data : (data.items || []));
      setApiStatus(data.status || "live");
      setActiveDestination(data.destination || null);
      setMessage(data.message || data.error || "");
    } catch (error: any) {
      setDestinations([]);
      setApiStatus("api_error");
      setMessage(error.message || "Live places could not be loaded");
      toast.error(error.message || "Live places could not be loaded");
    } finally {
      setLoading(false);
    }
  }, [selectedTripId, search, category, sortBy]);

  useEffect(() => { loadTrips(); }, [loadTrips]);
  useEffect(() => { fetchDestinations(); }, [fetchDestinations]);


  const addToTrip = async (place: any) => {
    if (!selectedTripId) { toast.error("Select a trip first"); return; }
    try {
      const res = await fetch("/api/destinations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId: selectedTripId, place }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not add place");
      toast.success(`${place.name} added to the trip itinerary`);
    } catch (error: any) {
      toast.error(error.message || "Could not add place");
    }
  };

  const currentTrip = trips.find((t) => t.id === selectedTripId);
  const tripDestination = currentTrip?.destinations?.[0];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold font-display">Explore Live Places</h1>
          {apiStatus ? <Badge variant={apiStatus === "live" ? "success" : "secondary"}>{apiStatus}</Badge> : null}
        </div>
        <p className="text-muted-foreground text-sm mt-1">
          Explore uses real Geoapify API data for the selected trip destination. Add useful places directly into the selected trip itinerary. Static/mock destination cards are disabled.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid md:grid-cols-5 gap-3">
            <div className="md:col-span-2">
              <Select value={selectedTripId} onChange={(e) => setSelectedTripId(e.target.value)}>
                {trips.length === 0 ? <option value="">No trips yet</option> : null}
                {trips.map((trip) => {
                  const d = trip.destinations?.[0];
                  return <option key={trip.id} value={trip.id}>{trip.title}{d ? ` — ${d.name}` : ""}</option>;
                })}
              </Select>
            </div>
            <div className="relative md:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search real places..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && fetchDestinations()} className="pl-9" />
            </div>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c === "All" ? "All Categories" : c}</option>)}
            </Select>
            <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="rating">Top Rated</option>
              <option value="name">Name A-Z</option>
              <option value="price">Lowest Price</option>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>Current destination: <b className="text-foreground">{activeDestination?.city || tripDestination?.name || "none"}</b>{activeDestination?.country || tripDestination?.country ? `, ${activeDestination?.country || tripDestination?.country}` : ""}</span>
            <Button type="button" variant="outline" size="sm" onClick={fetchDestinations}><RefreshCw className="h-3.5 w-3.5 mr-2" /> Refresh live data</Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : destinations.length === 0 ? (
        <EmptyState icon={Compass} title="No real places found" description={message || "Create/select a trip or check GEOAPIFY_API_KEY. Mock destinations are intentionally not shown."} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {destinations.map((d, i) => {
            const tags = Array.isArray(d.tags) ? d.tags : [];
            return (
              <Card key={`${d.id}-${i}`} className="card-hover overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold line-clamp-1">{d.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{d.city}{d.country ? `, ${d.country}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-1 text-yellow-500 shrink-0"><Star className="h-3.5 w-3.5 fill-current" /><span className="text-xs font-medium">{Number(d.rating || 0).toFixed(1)}</span></div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3">{d.description || d.address || "Address not returned by provider."}</p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-[10px] capitalize">{d.category || "place"}</Badge>
                    <Badge variant="outline" className="text-[10px]">{d.source || "Geoapify"}</Badge>
                  </div>
                  {tags.length ? <div className="flex flex-wrap gap-1">{tags.slice(0, 4).map((t: string) => <span key={t} className="text-[10px] text-muted-foreground">#{t.split(".").pop()}</span>)}</div> : null}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {d.latitude?.toFixed?.(3)}, {d.longitude?.toFixed?.(3)}</span>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="default" size="sm" onClick={() => addToTrip(d)} disabled={!selectedTripId}><Plus className="h-3.5 w-3.5 mr-1" /> Add</Button>
                      {d.website ? <Button type="button" variant="secondary" size="sm" onClick={() => window.open(d.website, "_blank")}><ExternalLink className="h-3.5 w-3.5 mr-1" /> Open</Button> : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
