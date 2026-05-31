"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, Badge, EmptyState, Button, Dialog, Label, Input, Select } from "@/components/ui";
import { BookOpen, Plus, Trash2, Edit, Loader2, Calendar, X, CheckCircle, AlertCircle } from "lucide-react";
import { formatDate, formatCurrency, getStatusColor } from "@/lib/utils";
import Link from "next/link";
import toast from "react-hot-toast";

const TYPE_ICONS: Record<string, string> = {
  HOTEL: "🏨", FLIGHT: "✈️", TRAIN: "🚂", RESTAURANT: "🍽️",
  TOUR: "🗺️", BUS: "🚌", CAR_RENTAL: "🚗", OTHER: "📋",
};

const EMPTY_FORM = {
  tripId: "", type: "HOTEL", provider: "", bookingRef: "",
  url: "", status: "PENDING", checkIn: "", checkOut: "", amount: "", currency: "USD", notes: "",
};

export default function BookingsPage() {
  const [trips, setTrips] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTrip, setFilterTrip] = useState("ALL");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  // SmartTravel does not sell tickets or hotel rooms. Bookings are saved as selected/planned records only.

  // Cancel confirm
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [tripsRes, bookingsRes] = await Promise.all([
      fetch("/api/trips"),
      fetch("/api/bookings/all"),
    ]);
    if (tripsRes.ok) setTrips(await tripsRes.json());
    if (bookingsRes.ok) setBookings(await bookingsRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const setF = (k: string) => (e: React.ChangeEvent<any>) => setForm(p => ({ ...p, [k]: e.target.value }));
  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, tripId: trips[0]?.id || "" });
    setShowForm(true);
  };

  const openEdit = (b: any) => {
    setEditing(b);
    setForm({
      tripId: b.tripId, type: b.type, provider: b.provider,
      bookingRef: b.bookingRef || "", url: b.url || "", status: b.status,
      checkIn: b.checkIn ? new Date(b.checkIn).toISOString().split("T")[0] : "",
      checkOut: b.checkOut ? new Date(b.checkOut).toISOString().split("T")[0] : "",
      amount: b.amount ? String(b.amount) : "", currency: b.currency || "USD", notes: b.notes || "",
    });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.tripId) { toast.error("Select a trip"); return; }
    if (!form.provider) { toast.error("Enter a provider"); return; }

    if (editing) {
      // Simple edit
      setSaving(true);
      const res = await fetch(`/api/bookings/${editing.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount: form.amount ? Number(form.amount) : undefined }),
      });
      if (res.ok) { toast.success("Booking updated!"); setShowForm(false); fetchData(); }
      else { const d = await res.json().catch(() => ({})); toast.error(d.error || "Could not update this booking. Check the fields and try again."); }
      setSaving(false);
    } else {
      // New booking — save as selected/planned only. SmartTravel redirects to real sellers.
      setSaving(true);
      const res = await fetch("/api/bookings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, tripId: form.tripId, amount: form.amount ? Number(form.amount) : undefined }),
      });
      if (res.ok) { toast.success("Booking saved to trip!"); setShowForm(false); fetchData(); }
      else { const d = await res.json().catch(() => ({})); toast.error(d.error || "Could not add this booking. Check the fields and try again."); }
      setSaving(false);
    }
  };

  const handleCancel = async (id: string) => {
    setCancelling(true);
    const res = await fetch(`/api/bookings/${id}/cancel`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      toast.success("Booking cancelled in your SmartTravel plan.");
      setCancellingId(null);
      fetchData();
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error || "Could not cancel this booking. Please try again.");
    }
    setCancelling(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Permanently delete this booking? This cannot be undone.")) return;
    const res = await fetch(`/api/bookings/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Booking deleted"); fetchData(); }
    else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error || "Could not delete this booking. Please try again.");
    }
  };

  const filtered = filterTrip === "ALL" ? bookings : bookings.filter(b => b.tripId === filterTrip);
  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">All Bookings</h1>
          <p className="text-sm text-muted-foreground mt-1">{bookings.length} booking{bookings.length !== 1 ? "s" : ""} total</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Select value={filterTrip} onChange={e => setFilterTrip(e.target.value)} className="w-full sm:w-44">
            <option value="ALL">All Trips</option>
            {trips.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </Select>
          <Button onClick={openCreate} className="gap-1 shrink-0"><Plus className="h-4 w-4" /> Add Booking</Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={BookOpen} title="No bookings yet"
          description={trips.length === 0 ? "Create a trip first, then add bookings." : "No demo bookings are generated. Add real selected flights/hotels from Planner or add a manual booking."}
          action={trips.length > 0 ? <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Add Booking</Button> : <Link href="/trips?create=true"><Button>Create a Trip</Button></Link>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(b => (
            <Card key={b.id} className="group hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{TYPE_ICONS[b.type] || "📋"}</span>
                    <div>
                      <p className="font-semibold text-sm">{b.provider}</p>
                      <p className="text-xs text-muted-foreground">{b.type}</p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(b.status)}>{b.status}</Badge>
                </div>

                {b.bookingRef && <p className="text-xs text-muted-foreground mb-1">Ref: <span className="font-mono font-medium">{b.bookingRef}</span></p>}
                {(b.checkIn || b.checkOut) && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                    <Calendar className="h-3 w-3" />
                    {b.checkIn && formatDate(b.checkIn)}{b.checkOut ? ` → ${formatDate(b.checkOut)}` : ""}
                  </p>
                )}
                {b.amount != null && <p className="text-sm font-semibold mt-2">{formatCurrency(b.amount, b.currency)}</p>}

                {b.tripTitle && <Link href={`/trip/${b.tripId}`} className="text-xs text-primary hover:underline block mt-1">{b.tripTitle} →</Link>}
                <div className="flex gap-1 mt-3 pt-2 border-t opacity-0 group-hover:opacity-100 transition-opacity duration-75 flex-wrap">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(b)} className="h-7 px-2 gap-1 text-xs">
                    <Edit className="h-3 w-3" /> Edit
                  </Button>
                  {b.status !== "CANCELLED" && (
                    <Button size="sm" variant="ghost" onClick={() => setCancellingId(b.id)} className="h-7 px-2 gap-1 text-xs text-orange-600 hover:text-orange-600">
                      <X className="h-3 w-3" /> Cancel
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(b.id)} className="h-7 px-2 gap-1 text-xs text-destructive hover:text-destructive">
                    <Trash2 className="h-3 w-3" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Booking Dialog */}
      <Dialog open={showForm} onClose={() => setShowForm(false)} title={editing ? "Edit Booking" : "Add Booking"}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <Label>Trip *</Label>
            <Select value={form.tripId} onChange={setF("tripId")} className="mt-1" required>
              <option value="">Select trip</option>
              {trips.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={form.type} onChange={setF("type")} className="mt-1">
                <option value="HOTEL">🏨 Hotel</option>
                <option value="FLIGHT">✈️ Flight</option>
                <option value="TRAIN">🚂 Train</option>
                <option value="BUS">🚌 Bus</option>
                <option value="RESTAURANT">🍽️ Restaurant</option>
                <option value="TOUR">🗺️ Tour</option>
                <option value="CAR_RENTAL">🚗 Car Rental</option>
                <option value="OTHER">📋 Other</option>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onChange={setF("status")} className="mt-1">
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="COMPLETED">Completed</option>
              </Select>
            </div>
          </div>
          <div><Label>Provider *</Label><Input placeholder="Hilton, Turkish Airlines..." value={form.provider} onChange={setF("provider")} className="mt-1" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Booking Ref</Label><Input placeholder="ABC123" value={form.bookingRef} onChange={setF("bookingRef")} className="mt-1" /></div>
            <div>
              <Label>Amount</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={setF("amount")} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Check In / Date</Label><Input type="date" value={form.checkIn} onChange={setF("checkIn")} className="mt-1" /></div>
            <div><Label>Check Out</Label><Input type="date" value={form.checkOut} onChange={setF("checkOut")} className="mt-1" /></div>
          </div>
          <div><Label>Notes</Label><Input placeholder="Any notes..." value={form.notes} onChange={setF("notes")} className="mt-1" /></div>

          {!editing && Number(form.amount) > 0 && (
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-sm">
              <p className="font-medium text-primary">Selection estimate</p>
              <p className="text-muted-foreground text-xs mt-0.5">SmartTravel will save this as a selected/planned booking. Final purchase happens only on the external provider site.</p>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>
              {editing ? "Save Changes" : "Save Booking"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Cancel Confirm Dialog */}
      <Dialog open={!!cancellingId} onClose={() => setCancellingId(null)} title="Cancel Booking">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to cancel this booking?
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setCancellingId(null)}>Keep Booking</Button>
            <Button variant="destructive" loading={cancelling} onClick={() => cancellingId && handleCancel(cancellingId)}>
              Yes, Cancel Booking
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
