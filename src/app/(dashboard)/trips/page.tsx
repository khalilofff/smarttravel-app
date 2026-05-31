"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Card, CardContent, Badge, EmptyState, Select, Dialog, Label, Textarea } from "@/components/ui";
import { Plus, Search, Plane, MapPin, Calendar, PiggyBank, Grid3X3, List, Loader2, Trash2, Archive } from "lucide-react";
import { formatCurrency, formatDateRange, getStatusColor } from "@/lib/utils";
import toast from "react-hot-toast";

const DESTINATIONS = [
  { name: "Istanbul", country: "Turkey", lat: 41.0082, lng: 28.9784 },
  { name: "Paris", country: "France", lat: 48.8566, lng: 2.3522 },
  { name: "Tokyo", country: "Japan", lat: 35.6762, lng: 139.6503 },
  { name: "Rome", country: "Italy", lat: 41.9028, lng: 12.4964 },
  { name: "Barcelona", country: "Spain", lat: 41.3874, lng: 2.1686 },
  { name: "London", country: "UK", lat: 51.5074, lng: -0.1278 },
  { name: "Dubai", country: "UAE", lat: 25.2048, lng: 55.2708 },
  { name: "Baku", country: "Azerbaijan", lat: 40.4093, lng: 49.8671 },
];

export default function TripsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showCreate, setShowCreate] = useState(searchParams.get("create") === "true");
  const [creating, setCreating] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");

  const [form, setForm] = useState({
    title: "", description: "", startDate: "", endDate: "", totalBudget: 1000,
    currency: "USD", travelerCount: 1, travelStyle: "MODERATE", destination: "",
    notes: "", isPublic: false,
  });

  const fetchTrips = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    const res = await fetch(`/api/trips?${params}`);
    if (res.ok) setTrips(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchTrips(); }, [statusFilter]);

  // Auto-search when search input changes
  useEffect(() => {
    const t = setTimeout(() => fetchTrips(), 400);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const buildTripPayload = () => {
    const dest = DESTINATIONS.find(d => d.name === form.destination);
    if (!dest) { toast.error("Please select a destination"); return null; }
    if (!form.title || !form.startDate || !form.endDate) { toast.error("Fill in all required fields"); return null; }
    if (new Date(form.endDate) < new Date(form.startDate)) { toast.error("End date must be after start date"); return null; }
    return {
      ...form,
      totalBudget: Number(form.totalBudget),
      travelerCount: Number(form.travelerCount),
      destinations: [{ name: dest.name, country: dest.country, latitude: dest.lat, longitude: dest.lng }],
    };
  };

  const submitTripPayload = async (payload: any) => {
    const res = await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success("Trip created!");
      setShowCreate(false);
      router.push(`/trip/${data.id}`);
      return;
    }
    toast.error(data.message || data.error || "Could not create trip. Check your dates, destination, and trip details.");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = buildTripPayload();
    if (!payload) return;
    setCreating(true);
    await submitTripPayload(payload);
    setCreating(false);
  };


  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handleDelete = async (id: string, title: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/trips/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Trip deleted"); fetchTrips(); }
    else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error || "Could not delete this trip. Please try again.");
    }
  };

  const handleArchive = async (id: string, title: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Archive "${title}"? You can filter by Archived status to find it later.`)) return;
    const res = await fetch(`/api/trips/${id}/archive`, { method: "PATCH" });
    if (res.ok) { toast.success("Trip archived"); fetchTrips(); }
    else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error || "Could not archive this trip.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">My Trips</h1>
          <p className="text-muted-foreground text-sm mt-1">{trips.length} trip{trips.length !== 1 ? "s" : ""} total</p>
        </div>
        <Button onClick={() => router.push("/planner")} className="gap-2"><Plus className="h-4 w-4" /> New AI Trip</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search trips..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && fetchTrips()} className="pl-9" />
        </div>
        <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-40">
          <option value="ALL">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="PLANNED">Planned</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
          <option value="ARCHIVED">Archived</option>
        </Select>
        <div className="flex gap-1 p-1 rounded-lg bg-muted">
          <button onClick={() => setView("grid")} className={`p-2 rounded-md ${view === "grid" ? "bg-background shadow-sm" : ""}`}><Grid3X3 className="h-4 w-4" /></button>
          <button onClick={() => setView("list")} className={`p-2 rounded-md ${view === "list" ? "bg-background shadow-sm" : ""}`}><List className="h-4 w-4" /></button>
        </div>
      </div>

      {/* Trip Grid/List */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : trips.length === 0 ? (
        <EmptyState icon={Plane} title="No trips found" description="Generate your first trip with AI Planner, then it will appear here." action={<Button onClick={() => router.push("/planner")}>Create with AI Planner</Button>} />
      ) : (
        <div className={view === "grid" ? "grid sm:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
          {trips.map(trip => (
            <Link key={trip.id} href={`/trip/${trip.id}`} className="group relative">
              <Card className="card-hover h-full">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-lg group-hover:text-primary transition-colors line-clamp-1">{trip.title}</h3>
                    <div className="flex items-center gap-1">
                      <Badge className={getStatusColor(trip.status)} variant="outline">{trip.status}</Badge>
                      {trip.status !== "ARCHIVED" && (
                        <button
                          onClick={(e) => handleArchive(trip.id, trip.title, e)}
                          className="p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Archive trip"
                        >
                          <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDelete(trip.id, trip.title, e)}
                        className="p-1 rounded hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                        title="Delete trip"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0" /><span className="truncate">{trip.destinations?.[0]?.name}, {trip.destinations?.[0]?.country}</span></div>
                    <div className="flex items-center gap-2"><Calendar className="h-4 w-4 shrink-0" />{formatDateRange(trip.startDate, trip.endDate)}</div>
                    <div className="flex items-center gap-2"><PiggyBank className="h-4 w-4 shrink-0" />{formatCurrency(trip.totalBudget, trip.currency)}</div>
                  </div>
                  {trip.description && <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{trip.description}</p>}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Create Trip Dialog */}
      <Dialog open={showCreate} onClose={() => setShowCreate(false)} title="Create New Trip">
        <form onSubmit={handleCreate} className="space-y-4">
          <div><Label>Trip Title *</Label><Input placeholder="Summer in Istanbul" value={form.title} onChange={set("title")} className="mt-1.5" required /></div>
          <div><Label>Destination *</Label>
            <Select value={form.destination} onChange={set("destination")} className="mt-1.5" required>
              <option value="">Select destination</option>
              {DESTINATIONS.map(d => <option key={d.name} value={d.name}>{d.name}, {d.country}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mobile-date-grid">
            <div><Label>Start Date *</Label><Input type="date" value={form.startDate} onChange={set("startDate")} className="mt-1.5 date-input" required /></div>
            <div><Label>End Date *</Label><Input type="date" value={form.endDate} onChange={set("endDate")} className="mt-1.5 date-input" required /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Budget</Label><Input type="number" min={0} value={form.totalBudget} onChange={set("totalBudget")} className="mt-1.5" /></div>
            <div><Label>Currency</Label>
              <Select value={form.currency} onChange={set("currency")} className="mt-1.5">
                <option value="USD">USD ($)</option><option value="EUR">EUR (€)</option><option value="GBP">GBP (£)</option>
                <option value="TRY">TRY (₺)</option><option value="JPY">JPY (¥)</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Travelers</Label><Input type="number" min={1} max={50} value={form.travelerCount} onChange={set("travelerCount")} className="mt-1.5" /></div>
            <div><Label>Travel Style</Label>
              <Select value={form.travelStyle} onChange={set("travelStyle")} className="mt-1.5">
                <option value="BUDGET">Budget</option><option value="MODERATE">Moderate</option><option value="LUXURY">Luxury</option>
                <option value="BACKPACKER">Backpacker</option><option value="FAMILY">Family</option><option value="ADVENTURE">Adventure</option>
                <option value="CULTURAL">Cultural</option><option value="RELAXATION">Relaxation</option>
              </Select>
            </div>
          </div>
          <div><Label>Notes</Label><Textarea placeholder="Any special notes..." value={form.notes} onChange={set("notes")} className="mt-1.5" /></div>
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={creating}>Create Trip</Button>
          </div>
        </form>
      </Dialog>


    </div>
  );
}
