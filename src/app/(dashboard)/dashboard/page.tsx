"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, EmptyState, Dialog, Input, Label, Select, Textarea } from "@/components/ui";
import { Plane, Plus, Calendar, PiggyBank, MapPin, Users, TrendingUp, Sparkles, Loader2, ArrowRight, AlertTriangle, Bell, Activity, BookOpen } from "lucide-react";
import { formatCurrency, formatDateRange, getStatusColor, getBudgetPercentage } from "@/lib/utils";
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

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [trips, setTrips] = useState<any[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [bookings, setBookings] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenseTrips, setExpenseTrips] = useState<any[]>([]);

  const [form, setForm] = useState({
    title: "", description: "", startDate: "", endDate: "", totalBudget: 1000,
    currency: "USD", travelerCount: 1, travelStyle: "MODERATE", destination: "", notes: "",
  });

  const [expenseForm, setExpenseForm] = useState({
    tripId: "", amount: "", category: "FOOD", description: "", date: new Date().toISOString().split("T")[0], notes: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tripsRes, expRes, notifRes, bookingsRes, activityRes] = await Promise.all([
        fetch("/api/trips"),
        fetch("/api/expenses/recent"),
        fetch("/api/notifications"),
        fetch("/api/bookings"),
        fetch("/api/activity/recent"),
      ]);
      if (tripsRes.ok) setTrips(await tripsRes.json());
      if (expRes.ok) setRecentExpenses(await expRes.json());
      if (notifRes.ok) { const d = await notifRes.json(); setNotifications(d.notifications || []); setUnreadCount(d.unreadCount || 0); }
      if (bookingsRes.ok) setBookings(await bookingsRes.json());
      if (activityRes.ok) { const d = await activityRes.json(); setActivities(d.activities || []); }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const upcomingTrips = trips.filter(t =>
    new Date(t.startDate) >= new Date() && ["PLANNED", "ACTIVE"].includes(t.status)
  ).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).slice(0, 3);

  const totalBudget = trips.reduce((s, t) => s + (t.totalBudget || 0), 0);
  const totalSpent = trips.reduce((s, t) => s + (t.expenses?.reduce((es: number, e: any) => es + e.amount, 0) || 0), 0);
  const confirmedBookings = bookings.filter(b => b.status === "CONFIRMED").length;
  const pendingBookings = bookings.filter(b => b.status === "PENDING").length;
  const remainingBudget = Math.max(0, totalBudget - totalSpent);

  const setF = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));
  const setEF = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setExpenseForm(p => ({ ...p, [k]: e.target.value }));

  const buildTripPayload = () => {
    const dest = DESTINATIONS.find(d => d.name === form.destination);
    if (!dest) { toast.error("Please select a destination"); return null; }
    if (!form.title || !form.startDate || !form.endDate) { toast.error("Fill required fields"); return null; }
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
    toast.error(data.message || data.error || "Could not create trip.");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = buildTripPayload();
    if (!payload) return;
    setCreating(true);
    await submitTripPayload(payload);
    setCreating(false);
  };


  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.tripId) { toast.error("Select a trip"); return; }
    if (!expenseForm.amount || Number(expenseForm.amount) <= 0) { toast.error("Enter a valid amount"); return; }
    const res = await fetch("/api/budget/expenses", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...expenseForm, tripId: expenseForm.tripId, amount: Number(expenseForm.amount) }),
    });
    if (res.ok) {
      toast.success("Expense added!");
      setShowAddExpense(false);
      setExpenseForm({ tripId: "", amount: "", category: "FOOD", description: "", date: new Date().toISOString().split("T")[0], notes: "" });
      fetchData();
    } else {
      const d = await res.json();
      toast.error(d.error || "Could not add expense. Check amount, category, and selected trip.");
    }
  };

  const openAddExpense = () => {
    setExpenseTrips(trips);
    setExpenseForm(p => ({ ...p, tripId: trips[0]?.id || "" }));
    setShowAddExpense(true);
  };

  const userName = session?.user?.name?.split(" ")[0] || "there";

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl lg:text-3xl font-bold font-display leading-tight break-words">Welcome, {userName} 👋</h1>
          <p className="text-muted-foreground mt-1">Here&apos;s what&apos;s happening with your travel plans.</p>
        </div>
        <div className="mobile-actions sm:flex sm:w-auto gap-2">
          <Button variant="outline" onClick={openAddExpense} className="gap-2">
            <Plus className="h-4 w-4" /> Add Expense
          </Button>
          <Button onClick={() => router.push("/planner")} className="gap-2">
            <Plus className="h-4 w-4" /> New AI Trip
          </Button>
        </div>
      </div>

      {/* Stat Cards — all clickable */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/trips">
          <div className="rounded-xl border bg-card p-5 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Trips</p>
                <p className="text-2xl font-bold mt-1">{trips.length}</p>
                <p className="text-xs text-muted-foreground mt-1">{upcomingTrips.length} upcoming</p>
              </div>
              <div className="rounded-xl bg-primary/10 p-3"><Plane className="h-5 w-5 text-primary" /></div>
            </div>
          </div>
        </Link>

        <Link href="/planner">
          <div className="rounded-xl border bg-card p-5 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">AI Planner</p>
                <p className="text-2xl font-bold mt-1">Live</p>
                <p className="text-xs text-primary mt-1">Flights · Hotels · Places</p>
              </div>
              <div className="rounded-xl bg-green-500/10 p-3"><Sparkles className="h-5 w-5 text-green-600" /></div>
            </div>
          </div>
        </Link>

        <Link href="/budget">
          <div className="rounded-xl border bg-card p-5 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(totalSpent)}</p>
                {totalBudget > 0 && (
                  <p className={`text-xs mt-1 ${getBudgetPercentage(totalSpent, totalBudget) >= 90 ? "text-red-500" : "text-muted-foreground"}`}>
                    {getBudgetPercentage(totalSpent, totalBudget)}% used
                  </p>
                )}
              </div>
              <div className="rounded-xl bg-primary/10 p-3"><TrendingUp className="h-5 w-5 text-primary" /></div>
            </div>
          </div>
        </Link>

        <Link href="/trips">
          <div className="rounded-xl border bg-card p-5 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Upcoming</p>
                <p className="text-2xl font-bold mt-1">{upcomingTrips.length}</p>
                <p className="text-xs text-muted-foreground mt-1">trips planned</p>
              </div>
              <div className="rounded-xl bg-primary/10 p-3"><Calendar className="h-5 w-5 text-primary" /></div>
            </div>
          </div>
        </Link>
      </div>

      {/* Budget warning */}
      {totalBudget > 0 && getBudgetPercentage(totalSpent, totalBudget) >= 90 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400">
            You&apos;ve used {getBudgetPercentage(totalSpent, totalBudget)}% of your total budget across all trips.
          </p>
          <Link href="/budget" className="ml-auto text-xs text-red-600 hover:underline font-medium shrink-0">View Budget</Link>
        </div>
      )}


      {/* Local demo widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><BookOpen className="h-4 w-4" /> Booking Summary</div><p className="text-2xl font-bold mt-2">{confirmedBookings}</p><p className="text-xs text-muted-foreground">confirmed • {pendingBookings} pending</p><Link href="/bookings" className="text-xs text-primary mt-2 inline-block">Manage bookings</Link></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Bell className="h-4 w-4" /> Notifications</div><p className="text-2xl font-bold mt-2">{unreadCount}</p><p className="text-xs text-muted-foreground">unread local alerts</p><Link href="/notifications" className="text-xs text-primary mt-2 inline-block">Open notifications</Link></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><PiggyBank className="h-4 w-4" /> Remaining Budget</div><p className="text-2xl font-bold mt-2">{formatCurrency(remainingBudget)}</p><p className="text-xs text-muted-foreground">{totalBudget ? `${getBudgetPercentage(totalSpent, totalBudget)}% used` : "no trip budget yet"}</p><Link href="/budget" className="text-xs text-primary mt-2 inline-block">View budget</Link></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Activity className="h-4 w-4" /> Recent Activity</div><p className="text-2xl font-bold mt-2">{activities.length}</p><p className="text-xs text-muted-foreground">latest local events</p><Link href="/activity" className="text-xs text-primary mt-2 inline-block">View activity</Link></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Trips */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Recent Trips</CardTitle>
              <Link href="/trips" className="text-sm text-primary hover:underline flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {trips.length === 0 ? (
                <EmptyState
                  icon={Plane}
                  title="No trips yet"
                  description="Create your first trip to start planning your adventure!"
                  action={<Button onClick={() => router.push("/planner")} size="sm"><Plus className="h-4 w-4 mr-1" /> Create with AI Planner</Button>}
                />
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {trips.slice(0, 4).map(trip => {
                    const spent = trip.expenses?.reduce((s: number, e: any) => s + e.amount, 0) || 0;
                    const pct = getBudgetPercentage(spent, trip.totalBudget);
                    return (
                      <Link key={trip.id} href={`/trip/${trip.id}`} className="group block p-4 rounded-xl border hover:shadow-md hover:-translate-y-0.5 transition-all">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold group-hover:text-primary transition-colors line-clamp-1">{trip.title}</h3>
                          <Badge className={getStatusColor(trip.status)} variant="outline">{trip.status}</Badge>
                        </div>
                        <div className="space-y-1.5 text-sm text-muted-foreground mb-3">
                          <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{trip.destinations?.[0]?.name || "No destination"}</div>
                          <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{formatDateRange(trip.startDate, trip.endDate)}</div>
                          <div className="flex items-center gap-1.5 justify-between">
                            <span className="flex items-center gap-1"><PiggyBank className="h-3.5 w-3.5" />{formatCurrency(spent, trip.currency)} / {formatCurrency(trip.totalBudget, trip.currency)}</span>
                            {pct >= 90 && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                          </div>
                        </div>
                        {/* mini progress bar */}
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-red-500" : pct >= 90 ? "bg-orange-500" : "bg-green-500"}`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Expenses */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Recent Expenses</CardTitle>
              <Button variant="ghost" size="sm" onClick={openAddExpense} className="gap-1 text-primary">
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </CardHeader>
            <CardContent>
              {recentExpenses.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground mb-3">No expenses recorded yet.</p>
                  {trips.length > 0 && (
                    <Button size="sm" variant="outline" onClick={openAddExpense}>
                      <Plus className="h-4 w-4 mr-1" /> Add First Expense
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {recentExpenses.map((exp: any) => (
                    <div key={exp.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium">{exp.description}</p>
                        <p className="text-xs text-muted-foreground capitalize">{exp.category?.toLowerCase()} · {exp.trip?.title}</p>
                      </div>
                      <span className="text-sm font-semibold">{formatCurrency(exp.amount, exp.currency)}</span>
                    </div>
                  ))}
                  <Link href="/budget" className="text-xs text-primary hover:underline block text-right pt-1">
                    View all expenses →
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Upcoming Trips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upcoming Trips</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingTrips.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-3">No upcoming trips planned.</p>
                  <Button size="sm" variant="outline" onClick={() => router.push("/planner")}>Plan with AI</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingTrips.map(trip => {
                    const daysUntil = Math.ceil((new Date(trip.startDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    return (
                      <Link key={trip.id} href={`/trip/${trip.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 flex-col">
                          <span className="text-xs font-bold text-primary leading-none">{daysUntil}</span>
                          <span className="text-[9px] text-primary leading-none">days</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{trip.title}</p>
                          <p className="text-xs text-muted-foreground">{trip.destinations?.[0]?.name} · {formatDateRange(trip.startDate, trip.endDate)}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Recent Activity</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {activities.length === 0 ? <p className="text-sm text-muted-foreground">No recent activity yet.</p> : activities.slice(0, 5).map((a: any) => (
                <div key={a.id} className="text-sm border-b pb-2 last:border-0 last:pb-0">
                  <p className="font-medium">{a.action || "Activity"}</p>
                  <p className="text-xs text-muted-foreground">{a.details || "Updated"}</p>
                </div>
              ))}
              <Link href="/activity" className="text-xs text-primary inline-block">Open activity</Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Latest Notifications</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {notifications.length === 0 ? <p className="text-sm text-muted-foreground">No notifications yet.</p> : notifications.slice(0, 4).map(n => (
                <div key={n.id} className="text-sm border-b pb-2 last:border-0 last:pb-0"><p className="font-medium">{n.title}</p><p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p></div>
              ))}
              <Link href="/notifications" className="text-xs text-primary inline-block">Open notifications</Link>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <button onClick={() => router.push("/planner")} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted transition-colors text-sm w-full text-left">
                <Plus className="h-4 w-4 text-primary" /> Create New Trip
              </button>
              <button onClick={openAddExpense} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted transition-colors text-sm w-full text-left">
                <PiggyBank className="h-4 w-4 text-primary" /> Log an Expense
              </button>
              <Link href="/planner" className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted transition-colors text-sm">
                <Sparkles className="h-4 w-4 text-primary" /> AI Trip Planner
              </Link>
              <Link href="/destinations" className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted transition-colors text-sm">
                <MapPin className="h-4 w-4 text-primary" /> Explore Destinations
              </Link>
              <Link href="/bookings" className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted transition-colors text-sm">
                <Calendar className="h-4 w-4 text-primary" /> Manage Bookings
              </Link>
              <Link href="/collaboration" className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted transition-colors text-sm">
                <Users className="h-4 w-4 text-primary" /> Collaboration
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Trip Dialog */}
      <Dialog open={showCreate} onClose={() => setShowCreate(false)} title="Create New Trip">
        <form onSubmit={handleCreate} className="space-y-4">
          <div><Label>Trip Title *</Label><Input placeholder="Summer in Istanbul" value={form.title} onChange={setF("title")} className="mt-1.5" required /></div>
          <div><Label>Destination *</Label>
            <Select value={form.destination} onChange={setF("destination")} className="mt-1.5" required>
              <option value="">Select destination</option>
              {DESTINATIONS.map(d => <option key={d.name} value={d.name}>{d.name}, {d.country}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Start Date *</Label><Input type="date" value={form.startDate} onChange={setF("startDate")} className="mt-1.5" required /></div>
            <div><Label>End Date *</Label><Input type="date" value={form.endDate} onChange={setF("endDate")} className="mt-1.5" required /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Budget</Label><Input type="number" min={0} value={form.totalBudget} onChange={setF("totalBudget")} className="mt-1.5" /></div>
            <div><Label>Currency</Label>
              <Select value={form.currency} onChange={setF("currency")} className="mt-1.5">
                <option value="USD">USD ($)</option><option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option><option value="TRY">TRY (₺)</option>
                <option value="AZN">AZN (₼)</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Travelers</Label><Input type="number" min={1} max={50} value={form.travelerCount} onChange={setF("travelerCount")} className="mt-1.5" /></div>
            <div><Label>Travel Style</Label>
              <Select value={form.travelStyle} onChange={setF("travelStyle")} className="mt-1.5">
                <option value="BUDGET">Budget</option><option value="MODERATE">Moderate</option>
                <option value="LUXURY">Luxury</option><option value="BACKPACKER">Backpacker</option>
                <option value="FAMILY">Family</option><option value="ADVENTURE">Adventure</option>
                <option value="CULTURAL">Cultural</option>
              </Select>
            </div>
          </div>
          <div><Label>Description</Label><Textarea placeholder="What's this trip about?" value={form.description} onChange={setF("description")} className="mt-1.5" /></div>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={creating}>Create Trip</Button>
          </div>
        </form>
      </Dialog>



      <Dialog open={showAddExpense} onClose={() => setShowAddExpense(false)} title="Add Expense">
        <form onSubmit={handleAddExpense} className="space-y-4">
          <div><Label>Trip *</Label>
            <Select value={expenseForm.tripId} onChange={setEF("tripId")} className="mt-1.5" required>
              <option value="">Select trip</option>
              {expenseTrips.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Amount *</Label><Input type="number" step="0.01" min={0.01} placeholder="0.00" value={expenseForm.amount} onChange={setEF("amount")} className="mt-1.5" required /></div>
            <div><Label>Category</Label>
              <Select value={expenseForm.category} onChange={setEF("category")} className="mt-1.5">
                <option value="ACCOMMODATION">Accommodation</option>
                <option value="TRANSPORT">Transport</option>
                <option value="FOOD">Food</option>
                <option value="ACTIVITIES">Activities</option>
                <option value="SHOPPING">Shopping</option>
                <option value="MISCELLANEOUS">Miscellaneous</option>
              </Select>
            </div>
          </div>
          <div><Label>Description</Label><Input placeholder="Optional, e.g. Dinner at restaurant..." value={expenseForm.description} onChange={setEF("description")} className="mt-1.5" /></div>
          <div><Label>Date</Label><Input type="date" value={expenseForm.date} onChange={setEF("date")} className="mt-1.5" /></div>
          <div><Label>Notes</Label><Textarea placeholder="Optional notes..." value={expenseForm.notes} onChange={setEF("notes")} className="mt-1.5" /></div>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setShowAddExpense(false)}>Cancel</Button>
            <Button type="submit">Add Expense</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
