"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Tabs, EmptyState, ProgressBar, Input, Label, Dialog, Select, Textarea, Avatar, ConfirmDialog } from "@/components/ui";
import { MapPin, Calendar, PiggyBank, Users, Sparkles, ThumbsUp, ThumbsDown, MessageSquare, Plus, Trash2, Edit, BookOpen, ArrowLeft, Loader2, Check, Star, SkipForward, Send, Copy, Archive, ChevronUp, ChevronDown, Download, X, Flag } from "lucide-react";
import { formatCurrency, formatDate, formatDateRange, getStatusColor, getBudgetPercentage, daysBetween } from "@/lib/utils";
import Link from "next/link";
import toast from "react-hot-toast";

export default function TripDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("itinerary");
  const [generating, setGenerating] = useState(false);

  // Dialog states
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showEditTrip, setShowEditTrip] = useState(false);
  const [showAddItem, setShowAddItem] = useState<string | null>(null); // dayId
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string; name: string; amount?: number; deleteNote?: string } | null>(null);
  const [comment, setComment] = useState("");
  const [addingExpense, setAddingExpense] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ targetType: "TRIP" | "COMMENT"; targetId: string; title: string } | null>(null);
  const [reportReason, setReportReason] = useState("SPAM");
  const [reportDetails, setReportDetails] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  const fetchTrip = async () => {
    const res = await fetch(`/api/trips/${id}`);
    if (res.ok) {
      setTrip(await res.json());
    } else {
      router.push("/trips");
    }
    setLoading(false);
  };

  useEffect(() => { fetchTrip(); }, [id]);

  // ─── ACTIONS ──────────────────────────────────

  const generateItinerary = async () => {
    setGenerating(true);
    const res = await fetch("/api/itinerary/generate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tripId: id }),
    });
    if (res.ok) { toast.success("Itinerary generated!"); fetchTrip(); }
    else { const d = await res.json(); toast.error(d.error || "Generation failed"); }
    setGenerating(false);
  };

  const handleVote = async (itemId: string, value: number) => {
    await fetch("/api/votes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itineraryItemId: itemId, value }) });
    fetchTrip();
  };

  const handleItemStatus = async (itemId: string, status: string) => {
    await fetch(`/api/itinerary/items/${itemId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    fetchTrip();
  };

  const handleReorder = async (itemId: string, direction: "up" | "down", dayItems: any[]) => {
    const idx = dayItems.findIndex((i: any) => i.id === itemId);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= dayItems.length) return;
    await Promise.all([
      fetch(`/api/itinerary/items/${dayItems[idx].id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderIndex: swapIdx }) }),
      fetch(`/api/itinerary/items/${dayItems[swapIdx].id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderIndex: idx }) }),
    ]);
    fetchTrip();
  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    await fetch("/api/comments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: comment, tripId: id }) });
    setComment(""); fetchTrip(); toast.success("Comment added");
  };

  const openReportDialog = (targetType: "TRIP" | "COMMENT", targetId: string, title: string) => {
    setReportTarget({ targetType, targetId, title });
    setReportReason("SPAM");
    setReportDetails("");
  };

  const submitReport = async () => {
    if (!reportTarget) return;
    setSubmittingReport(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType: reportTarget.targetType, targetId: reportTarget.targetId, reason: reportReason, details: reportDetails }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("Report submitted. Admin will review it locally.");
        setReportTarget(null);
        setReportDetails("");
      } else {
        toast.error(data.error || "Could not submit report");
      }
    } catch {
      toast.error("Failed to submit report");
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleDeleteTrip = async () => {
    const res = await fetch(`/api/trips/${id}`, { method: "DELETE" });
    if (res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.success(d.removedAmount ? `Trip deleted. ${Number(d.removedAmount).toFixed(2)} updated in the plan.` : "Trip deleted");
      
      router.push("/trips");
    }
    else { const d = await res.json().catch(() => ({})); toast.error(d.error || "Could not delete this trip. Please try again."); }
  };

  const handleDuplicate = async () => {
    const res = await fetch(`/api/trips/${id}/duplicate`, { method: "POST" });
    if (res.ok) { const t = await res.json(); toast.success("Trip duplicated!"); router.push(`/trip/${t.id}`); }
    else { const d = await res.json().catch(() => ({})); toast.error(d.error || "Could not duplicate this trip. Please try again."); }
  };

  const handleArchive = async () => {
    const res = await fetch(`/api/trips/${id}/archive`, { method: "PATCH" });
    if (res.ok) { toast.success("Trip archived"); setShowArchiveConfirm(false); fetchTrip(); }
    else { const d = await res.json().catch(() => ({})); toast.error(d.error || "Could not archive this trip. Please try again."); }
  };

  const handleStatusChange = async (newStatus: string) => {
    const res = await fetch(`/api/trips/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
    if (res.ok) { toast.success(`Status: ${newStatus}`); fetchTrip(); }
    else { const d = await res.json().catch(() => ({})); toast.error(d.error || "Could not update trip status. Please try again."); }
  };

  const handleEditTrip = async (data: any) => {
    const payload: any = {
      title: data.title,
      description: data.description,
      totalBudget: Number(data.totalBudget),
      travelerCount: Number(data.travelerCount),
      notes: data.notes,
    };
    if (data.startDate) payload.startDate = data.startDate;
    if (data.endDate) payload.endDate = data.endDate;

    const res = await fetch(`/api/trips/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) { toast.success("Trip updated"); setShowEditTrip(false); fetchTrip(); }
    else {
      const d = await res.json();
      toast.error(d.error || "Could not update this trip. Check dates, budget, and required fields.");
    }
  };

  const handleAddExpense = async (data: any) => {
    const amount = Number(data.amount);
    if (!amount || amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    setAddingExpense(true);
    try {
      const res = await fetch("/api/budget/expenses", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, tripId: id, amount }),
      });
      const result = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("Expense added");
        setShowExpenseForm(false);
        fetchTrip();
      } else {
        toast.error(result.error || "Could not add expense. Check amount, category, and selected trip.");
      }
    } finally {
      setAddingExpense(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!deleteTarget || deleteTarget.type !== "expense") return;
    const res = await fetch(`/api/expenses/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.success(d.removedAmount ? `Expense deleted. ${Number(d.removedAmount).toFixed(2)} updated in the plan.` : "Expense deleted");
      setDeleteTarget(null);  fetchTrip();
    }
    else { const d = await res.json().catch(() => ({})); toast.error(d.error || "Action could not be completed. Please try again."); }
  };

  const handleAddBooking = async (data: any) => {
    const res = await fetch("/api/bookings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, tripId: id, amount: data.amount ? Number(data.amount) : undefined }),
    });
    if (res.ok) { toast.success("Booking added"); setShowBookingForm(false); fetchTrip(); }
    else {
      const d = await res.json();
      if (res.status === 409) {
        toast.error("⚠️ Date conflict: You already have a hotel booking for these dates");
      } else {
        toast.error(d.error || "Action could not be completed. Please try again.");
      }
    }
  };

  const handleDeleteBooking = async () => {
    if (!deleteTarget || deleteTarget.type !== "booking") return;
    const res = await fetch(`/api/bookings/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.success(d.removedAmount ? `Booking deleted. ${Number(d.removedAmount).toFixed(2)} updated in the plan.` : "Booking deleted");
      setDeleteTarget(null);  fetchTrip();
    }
    else { const d = await res.json().catch(() => ({})); toast.error(d.error || "Action could not be completed. Please try again."); }
  };

  const handleEditBooking = async (data: any) => {
    if (!editingBooking) return;
    const res = await fetch(`/api/bookings/${editingBooking.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, amount: data.amount ? Number(data.amount) : undefined }),
    });
    if (res.ok) { toast.success("Booking updated"); setEditingBooking(null); fetchTrip(); }
    else {
      const d = await res.json();
      if (res.status === 409) {
        toast.error("⚠️ Date conflict: You already have a hotel booking for these dates");
      } else {
        toast.error(d.error || "Could not update this booking. Check dates and required fields.");
      }
    }
  };

  const handleDeleteItem = async () => {
    if (!deleteTarget || deleteTarget.type !== "item") return;
    const res = await fetch(`/api/itinerary/items/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.success(d.removedAmount ? `Item removed. ${Number(d.removedAmount).toFixed(2)} updated in the plan.` : "Item removed");
      setDeleteTarget(null);  fetchTrip();
    }
    else { const d = await res.json().catch(() => ({})); toast.error(d.error || "Action could not be completed. Please try again."); }
  };

  const handleAddItem = async (data: any) => {
    const res = await fetch("/api/itinerary/items", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, estimatedCost: Number(data.estimatedCost || 0) }),
    });
    if (res.ok) { toast.success("Item added"); setShowAddItem(null); fetchTrip(); }
    else { const d = await res.json().catch(() => ({})); toast.error(d.error || "Could not add itinerary item. Please check the fields."); }
  };

  const handleInvite = async (email: string, role: string) => {
    const res = await fetch("/api/collaboration", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tripId: id, email, role }),
    });
    if (res.ok) { toast.success("Invitation sent!"); setShowInviteForm(false); fetchTrip(); }
    else { const d = await res.json().catch(() => ({})); toast.error(d.error || "Could not invite collaborator. Use an existing local user email."); }
  };

  const handleRemoveCollaborator = async (collabId: string) => {
    const res = await fetch(`/api/collaboration/${collabId}`, { method: "DELETE" });
    if (res.ok) { toast.success("Collaborator removed"); fetchTrip(); }
    else { const d = await res.json().catch(() => ({})); toast.error(d.error || "Action could not be completed. Please try again."); }
  };

  const handleExportPDF = () => {
    window.open(`/export?tripId=${id}`, "_blank");
  };

  const handleShareTrip = async () => {
    try {
      await fetch(`/api/trips/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: true }),
      });
      const url = `${window.location.origin}/share/trip/${id}`;
      await navigator.clipboard.writeText(url);
      toast.success("Public trip share link copied");
    } catch {
      const url = `${window.location.origin}/share/trip/${id}`;
      toast.error(url);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!trip) return null;

  const totalSpent = trip.expenses?.reduce((s: number, e: any) => s + e.amount, 0) || 0;
  const budgetPct = getBudgetPercentage(totalSpent, trip.totalBudget);
  const isOwner = trip.userId === userId;
  const isEditor = isOwner || trip.collaborators?.some((c: any) => c.userId === userId && c.role === "EDITOR" && c.status === "ACCEPTED");
  const numDays = daysBetween(trip.startDate, trip.endDate);

  const tabs = [
    { id: "itinerary", label: "Itinerary", icon: Calendar },
    { id: "budget", label: "Budget", icon: PiggyBank },
    { id: "bookings", label: "Bookings", icon: BookOpen },
    { id: "collaboration", label: "Team", icon: Users },
    { id: "comments", label: "Comments", icon: MessageSquare },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ─── HEADER ────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
        <div className="flex items-center gap-2 sm:contents">
          <Link href="/trips"><Button variant="ghost" size="icon-sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
        </div>
        <div className="flex-1 min-w-0 w-full">
          <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-2xl font-bold font-display leading-tight break-words min-w-0 flex-1">{trip.title}</h1>
            {/* #17 Status Dropdown */}
            {isOwner ? (
              <select value={trip.status} onChange={e => handleStatusChange(e.target.value)}
                className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-background cursor-pointer">
                <option value="DRAFT">DRAFT</option><option value="PLANNED">PLANNED</option>
                <option value="ACTIVE">ACTIVE</option><option value="COMPLETED">COMPLETED</option>
              </select>
            ) : (
              <Badge className={getStatusColor(trip.status)}>{trip.status}</Badge>
            )}
          </div>
          <div className="mobile-trip-meta flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{trip.destinations?.[0]?.name}, {trip.destinations?.[0]?.country}</span>
            <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{formatDateRange(trip.startDate, trip.endDate)} ({numDays} days)</span>
            <span className="flex items-center gap-1"><PiggyBank className="h-4 w-4" />{formatCurrency(trip.totalBudget, trip.currency)}</span>
            <span className="flex items-center gap-1"><Users className="h-4 w-4" />{trip.travelerCount} traveler{trip.travelerCount > 1 ? "s" : ""}</span>
          </div>
        </div>
        {/* Action buttons */}
        <div className="mobile-actions-grid flex gap-2 flex-wrap shrink-0 sm:w-auto">
          <Button variant="outline" size="sm" onClick={() => openReportDialog("TRIP", String(id), trip.title)} title="Report trip" className="gap-1"><Flag className="h-4 w-4" /></Button>
          {/* Share + Export */}
          <Button variant="outline" size="sm" onClick={handleShareTrip} title="Copy Share Link"><Copy className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} title="Export PDF"><Download className="h-4 w-4" /></Button>
          {isOwner && (
            <>
              {/* #33 Edit */}
              <Button variant="outline" size="sm" onClick={() => setShowEditTrip(true)} title="Edit"><Edit className="h-4 w-4" /></Button>
              {/* #15 Duplicate */}
              <Button variant="outline" size="sm" onClick={handleDuplicate} title="Duplicate"><Copy className="h-4 w-4" /></Button>
              {/* #16 Archive */}
              <Button variant="outline" size="sm" onClick={() => setShowArchiveConfirm(true)} title="Archive"><Archive className="h-4 w-4" /></Button>
              {/* Delete */}
              <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(true)} title="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </>
          )}
        </div>
      </div>

      {/* Budget bar */}
      <Card><CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Budget: {formatCurrency(totalSpent, trip.currency)} / {formatCurrency(trip.totalBudget, trip.currency)}</span>
          <span className={`text-sm font-semibold ${budgetPct >= 100 ? "text-destructive" : budgetPct >= 80 ? "text-yellow-400" : ""}`}>{budgetPct}%</span>
        </div>
        <ProgressBar value={Math.min(totalSpent, trip.totalBudget)} max={trip.totalBudget || 1} />
      </CardContent></Card>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* ─── ITINERARY TAB ─────────────────────── */}
      {activeTab === "itinerary" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-lg font-semibold">Day-by-Day Itinerary</h2>
            {isEditor && <Button onClick={generateItinerary} loading={generating} className="gap-2 w-full sm:w-auto"><Sparkles className="h-4 w-4" />{trip.itinerary ? "Regenerate" : "Generate AI Itinerary"}</Button>}
          </div>
          {!trip.itinerary ? (
            <EmptyState icon={Sparkles} title="No itinerary yet" description="Generate an AI-powered itinerary!" action={isEditor ? <Button onClick={generateItinerary} loading={generating}>Generate Itinerary</Button> : undefined} />
          ) : (
            trip.itinerary.days.map((day: any) => (
              <Card key={day.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Day {day.dayNumber}: {day.title}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDate(day.date)} · Est. {formatCurrency(day.dailyCost, trip.currency)}</p>
                    </div>
                    {/* #20 Add Item */}
                    {isEditor && <Button size="sm" variant="outline" onClick={() => setShowAddItem(day.id)} className="gap-1"><Plus className="h-3.5 w-3.5" /> Add</Button>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {day.items.map((item: any, idx: number) => {
                    const upvotes = item.votes?.filter((v: any) => v.value === 1).length || 0;
                    const downvotes = item.votes?.filter((v: any) => v.value === -1).length || 0;
                    const tags = typeof item.tags === "string" ? JSON.parse(item.tags || "[]") : (item.tags || []);
                    return (
                      <div key={item.id} className={`p-4 rounded-xl border transition-colors ${item.status === "DONE" ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900" : item.status === "SKIPPED" ? "opacity-50" : "hover:bg-muted/50"}`}>
                        <div className="flex items-start gap-3">
                          {/* #21 Reorder */}
                          {isEditor && (
                            <div className="flex flex-col gap-0.5 mt-1">
                              <button onClick={() => handleReorder(item.id, "up", day.items)} disabled={idx === 0} className="p-0.5 rounded hover:bg-muted disabled:opacity-20"><ChevronUp className="h-3.5 w-3.5" /></button>
                              <button onClick={() => handleReorder(item.id, "down", day.items)} disabled={idx === day.items.length - 1} className="p-0.5 rounded hover:bg-muted disabled:opacity-20"><ChevronDown className="h-3.5 w-3.5" /></button>
                            </div>
                          )}
                          <div className="flex flex-col items-center gap-1 mt-1">
                            <Badge variant="secondary" className="text-[10px]">{item.timeSlot}</Badge>
                            {item.startTime && <span className="text-[10px] text-muted-foreground">{item.startTime}</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="font-medium">{item.title}</h4>
                                <p className="text-sm text-muted-foreground mt-0.5">{item.description}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-sm font-semibold">{formatCurrency(item.estimatedCost, trip.currency)}</span>
                                {isEditor && <button onClick={() => setDeleteTarget({ type: "item", id: item.id, name: item.title, amount: Number(item.estimatedCost || 0), deleteNote: "Itinerary items are estimates and will be removed from the plan." })} className="p-1 rounded hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>}
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              {tags.map((tag: string) => <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>)}
                              {item.crowdLevel && <span className="text-[10px] text-muted-foreground">Crowd: {item.crowdLevel}</span>}
                            </div>
                            <div className="flex items-center gap-3 mt-3">
                              <button onClick={() => handleVote(item.id, 1)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-green-600"><ThumbsUp className="h-3.5 w-3.5" /> {upvotes}</button>
                              <button onClick={() => handleVote(item.id, -1)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-600"><ThumbsDown className="h-3.5 w-3.5" /> {downvotes}</button>
                              <div className="flex gap-1 ml-auto">
                                <button onClick={() => handleItemStatus(item.id, "DONE")} className="p-1.5 rounded-md hover:bg-green-100 dark:hover:bg-green-900/30" title="Done"><Check className="h-3.5 w-3.5 text-green-600" /></button>
                                <button onClick={() => handleItemStatus(item.id, "FAVOURITE")} className="p-1.5 rounded-md hover:bg-yellow-100 dark:hover:bg-yellow-900/30" title="Favourite"><Star className="h-3.5 w-3.5 text-yellow-600" /></button>
                                <button onClick={() => handleItemStatus(item.id, "SKIPPED")} className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800" title="Skip"><SkipForward className="h-3.5 w-3.5" /></button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ─── BUDGET TAB ────────────────────────── */}
      {activeTab === "budget" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Budget & Expenses</h2>
            <div className="flex gap-2">
              <Link href={`/budget?tripId=${id}`}><Button variant="outline" size="sm">Full Budget View</Button></Link>
              {isEditor && <Button onClick={() => setShowExpenseForm(true)} size="sm" className="gap-1"><Plus className="h-4 w-4" /> Add Expense</Button>}
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Budget</p><p className="text-xl font-bold mt-1">{formatCurrency(trip.totalBudget, trip.currency)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Spent</p><p className="text-xl font-bold mt-1">{formatCurrency(totalSpent, trip.currency)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Remaining</p><p className={`text-xl font-bold mt-1 ${trip.totalBudget - totalSpent < 0 ? "text-destructive" : "text-green-400"}`}>{formatCurrency(trip.totalBudget - totalSpent, trip.currency)}</p></CardContent></Card>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {trip.budgetCategories?.map((cat: any) => {
              const pct = cat.planned > 0 ? Math.round((cat.spent / cat.planned) * 100) : 0;
              return (
              <Card key={cat.id}><CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium capitalize">{cat.category.toLowerCase().replace("_", " ")}</span>
                  <span className={`text-xs ${pct >= 100 ? "text-destructive" : "text-muted-foreground"}`}>{formatCurrency(cat.spent, trip.currency)} / {formatCurrency(cat.planned, trip.currency)}</span>
                </div>
                <ProgressBar value={Math.min(cat.spent, cat.planned)} max={cat.planned || 1} />
                <p className="text-[11px] text-muted-foreground mt-2">{pct}% used</p>
              </CardContent></Card>
            )})}
          </div>
          <Card><CardHeader><CardTitle className="text-base">Expense Log</CardTitle></CardHeader>
            <CardContent>
              {(!trip.expenses || trip.expenses.length === 0) ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No expenses recorded.</p>
              ) : (
                <div className="space-y-2">
                  {trip.expenses.map((exp: any) => (
                    <div key={exp.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium">{exp.description}</p>
                        <p className="text-xs text-muted-foreground capitalize">{exp.category.toLowerCase()} · {formatDate(exp.date)} · {exp.user?.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{formatCurrency(exp.amount, exp.currency)}</span>
                        {/* #19 Delete expense */}
                        {(exp.userId === userId || isOwner) && (
                          <button onClick={() => setDeleteTarget({ type: "expense", id: exp.id, name: exp.description, amount: Number(exp.amount || 0), deleteNote: `This will remove ${formatCurrency(Number(exp.amount || 0), exp.currency || trip.currency)} from tracked budget.` })} className="p-1 rounded hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── BOOKINGS TAB ──────────────────────── */}
      {activeTab === "bookings" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Bookings</h2>
            {isEditor && <Button onClick={() => setShowBookingForm(true)} size="sm" className="gap-1"><Plus className="h-4 w-4" /> Add Booking</Button>}
          </div>
          {(!trip.bookings || trip.bookings.length === 0) ? (
            <EmptyState icon={BookOpen} title="No bookings" description="Add your reservations." action={isEditor ? <Button onClick={() => setShowBookingForm(true)}>Add Booking</Button> : undefined} />
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {trip.bookings.map((b: any) => (
                <Card key={b.id}><CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge variant="secondary" className="mb-2 text-[10px]">{b.type}</Badge>
                      <h4 className="font-medium">{b.provider}</h4>
                      {b.bookingRef && <p className="text-xs text-muted-foreground">Ref: {b.bookingRef}</p>}
                      {b.checkIn && <p className="text-xs text-muted-foreground">{formatDate(b.checkIn)}{b.checkOut ? ` – ${formatDate(b.checkOut)}` : ""}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge className={getStatusColor(b.status)}>{b.status}</Badge>
                      {/* Edit booking */}
                      {isEditor && <button onClick={() => setEditingBooking(b)} className="p-1 rounded hover:bg-muted" title="Edit booking"><Edit className="h-3.5 w-3.5 text-muted-foreground" /></button>}
                      {/* #18 Delete booking */}
                      {isEditor && <button onClick={() => setDeleteTarget({ type: "booking", id: b.id, name: b.provider, amount: Number(b.amount || 0), deleteNote: "This booking will be removed from the plan." })} className="p-1 rounded hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>}
                    </div>
                  </div>
                  {b.amount && <p className="text-sm font-semibold mt-2">{formatCurrency(b.amount, b.currency)}</p>}
                </CardContent></Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TEAM TAB ──────────────────────────── */}
      {activeTab === "collaboration" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Collaborators</h2>
            {isOwner && <Button onClick={() => setShowInviteForm(true)} size="sm" className="gap-1"><Plus className="h-4 w-4" /> Invite</Button>}
          </div>
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-3 py-2 border-b">
              <Avatar name={trip.user?.name} size="sm" />
              <div className="flex-1"><p className="text-sm font-medium">{trip.user?.name}</p><p className="text-xs text-muted-foreground">{trip.user?.email}</p></div>
              <Badge variant="default">Owner</Badge>
            </div>
            {trip.collaborators?.map((c: any) => (
              <div key={c.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                <Avatar name={c.user?.name} size="sm" />
                <div className="flex-1"><p className="text-sm font-medium">{c.user?.name}</p><p className="text-xs text-muted-foreground">{c.user?.email}</p></div>
                <Badge variant="secondary">{c.role}</Badge>
                <Badge className={getStatusColor(c.status)}>{c.status}</Badge>
                {/* #26 Remove collaborator */}
                {isOwner && <button onClick={() => handleRemoveCollaborator(c.id)} className="p-1 rounded hover:bg-destructive/10" title="Remove"><X className="h-4 w-4 text-destructive" /></button>}
              </div>
            ))}
            {(!trip.collaborators || trip.collaborators.length === 0) && <p className="text-sm text-muted-foreground py-4 text-center">No collaborators yet.</p>}
          </CardContent></Card>
        </div>
      )}

      {/* ─── COMMENTS TAB ──────────────────────── */}
      {activeTab === "comments" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Comments</h2>
          <Card><CardContent className="p-4"><div className="flex gap-3">
            <Input placeholder="Write a comment..." value={comment} onChange={e => setComment(e.target.value)} onKeyDown={e => e.key === "Enter" && handleComment()} className="flex-1" />
            <Button onClick={handleComment} size="icon"><Send className="h-4 w-4" /></Button>
          </div></CardContent></Card>
          {trip.comments?.map((c: any) => (
            <Card key={c.id}><CardContent className="p-4"><div className="flex items-start gap-3">
              <Avatar name={c.user?.name} size="sm" />
              <div className="flex-1 min-w-0"><p className="text-sm"><span className="font-medium">{c.user?.name}</span> <span className="text-muted-foreground text-xs">· {formatDate(c.createdAt)}</span></p><p className="text-sm mt-1">{c.content}</p></div>
              <Button variant="ghost" size="icon-sm" onClick={() => openReportDialog("COMMENT", c.id, `Comment by ${c.user?.name || "user"}`)} title="Report comment"><Flag className="h-3.5 w-3.5 text-muted-foreground" /></Button>
            </div></CardContent></Card>
          ))}
          {(!trip.comments || trip.comments.length === 0) && <p className="text-sm text-muted-foreground text-center py-4">No comments yet.</p>}
        </div>
      )}

      {/* ─── ALL DIALOGS ───────────────────────── */}

      {/* #33 Edit Trip Dialog */}
      <EditTripDialog open={showEditTrip} onClose={() => setShowEditTrip(false)} onSubmit={handleEditTrip} trip={trip} />

      {/* Expense Form */}
      <ExpenseFormDialog open={showExpenseForm} onClose={() => setShowExpenseForm(false)} onSubmit={handleAddExpense} currency={trip.currency} loading={addingExpense} />

      {/* Booking Form */}
      <BookingFormDialog open={showBookingForm} onClose={() => setShowBookingForm(false)} onSubmit={handleAddBooking} />

      {/* Edit Booking Form */}
      <BookingFormDialog
        open={!!editingBooking}
        onClose={() => setEditingBooking(null)}
        onSubmit={handleEditBooking}
        initialData={editingBooking}
        title="Edit Booking"
      />

      {/* Invite Form */}
      <InviteFormDialog open={showInviteForm} onClose={() => setShowInviteForm(false)} onSubmit={handleInvite} />

      {/* #20 Add Item Dialog */}
      <AddItemDialog open={!!showAddItem} onClose={() => setShowAddItem(null)} onSubmit={(data: any) => handleAddItem({ ...data, dayId: showAddItem })} />

      <ReportDialog
        open={!!reportTarget}
        targetTitle={reportTarget?.title || "content"}
        reason={reportReason}
        details={reportDetails}
        loading={submittingReport}
        onReasonChange={setReportReason}
        onDetailsChange={setReportDetails}
        onClose={() => setReportTarget(null)}
        onSubmit={submitReport}
      />

      {/* Confirm Dialogs */}
      <ConfirmDialog open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} onConfirm={handleDeleteTrip} title="Delete Trip" description={`Permanently delete this trip and all data? Nested bookings and expenses will be deleted with the trip.`} confirmText="Delete Trip" />
      <ConfirmDialog open={showArchiveConfirm} onClose={() => setShowArchiveConfirm(false)} onConfirm={handleArchive} title="Archive Trip" description="Move this trip to archive?" confirmText="Archive" variant="default" />
      <ConfirmDialog open={deleteTarget?.type === "expense"} onClose={() => setDeleteTarget(null)} onConfirm={handleDeleteExpense} title="Delete Expense" description={`Delete "${deleteTarget?.name}"? ${deleteTarget?.deleteNote || "This expense will be removed from the budget tracker."}`} confirmText="Delete Trip" />
      <ConfirmDialog open={deleteTarget?.type === "booking"} onClose={() => setDeleteTarget(null)} onConfirm={handleDeleteBooking} title="Delete Booking" description={`Delete "${deleteTarget?.name}"? ${deleteTarget?.deleteNote || "The booking will be removed from the plan."}`} confirmText="Delete" />
      <ConfirmDialog open={deleteTarget?.type === "item"} onClose={() => setDeleteTarget(null)} onConfirm={handleDeleteItem} title="Remove Item" description={`Remove "${deleteTarget?.name}" from itinerary? ${deleteTarget?.deleteNote || "This is normally an estimate, not a budget adjustment."}`} confirmText="Remove" />
    </div>
  );
}

// ─── SUB DIALOGS ──────────────────────────────────


function ReportDialog({ open, targetTitle, reason, details, loading, onReasonChange, onDetailsChange, onClose, onSubmit }: any) {
  return (
    <Dialog open={open} onClose={onClose} title="Report Content">
      <div className="space-y-4">
        <div className="rounded-lg bg-muted/50 p-3 text-sm">
          <p className="font-medium">{targetTitle}</p>
          <p className="text-muted-foreground text-xs mt-1">This report stays local and appears in Admin → Moderation.</p>
        </div>
        <div>
          <Label>Reason</Label>
          <Select value={reason} onChange={(e: any) => onReasonChange(e.target.value)} className="mt-1">
            <option value="SPAM">Spam</option>
            <option value="INAPPROPRIATE">Inappropriate</option>
            <option value="OFFENSIVE">Offensive</option>
            <option value="OTHER">Other</option>
          </Select>
        </div>
        <div>
          <Label>Details</Label>
          <Textarea value={details} onChange={(e: any) => onDetailsChange(e.target.value)} className="mt-1" placeholder="Optional details for the admin..." />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={onSubmit} loading={loading} className="gap-1"><Flag className="h-4 w-4" /> Submit Report</Button>
        </div>
      </div>
    </Dialog>
  );
}

function toDateInputValue(val: any): string {
  if (!val) return "";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return "";
    // Clamp to reasonable range: 2000–2099
    const year = d.getFullYear();
    if (year < 2000 || year > 2099) {
      // Return today's date as fallback
      return new Date().toISOString().split("T")[0];
    }
    return d.toISOString().split("T")[0];
  } catch {
    return "";
  }
}

function EditTripDialog({ open, onClose, onSubmit, trip }: any) {
  const [form, setForm] = useState({ title: "", description: "", totalBudget: "", travelerCount: "", notes: "", startDate: "", endDate: "" });
  useEffect(() => {
    if (trip) setForm({
      title: trip.title || "",
      description: trip.description || "",
      totalBudget: String(trip.totalBudget || ""),
      travelerCount: String(trip.travelerCount || ""),
      notes: trip.notes || "",
      startDate: toDateInputValue(trip.startDate),
      endDate: toDateInputValue(trip.endDate),
    });
  }, [trip, open]);
  const set = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));
  return (
    <Dialog open={open} onClose={onClose} title="Edit Trip">
      <div className="space-y-3">
        <div><Label>Title</Label><Input value={form.title} onChange={set("title")} className="mt-1" /></div>
        <div><Label>Description</Label><Textarea value={form.description} onChange={set("description")} className="mt-1" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={set("startDate")} className="mt-1" /></div>
          <div><Label>End Date</Label><Input type="date" value={form.endDate} onChange={set("endDate")} className="mt-1" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Budget</Label><Input type="number" value={form.totalBudget} onChange={set("totalBudget")} className="mt-1" /></div>
          <div><Label>Travelers</Label><Input type="number" value={form.travelerCount} onChange={set("travelerCount")} className="mt-1" /></div>
        </div>
        <div><Label>Notes</Label><Textarea value={form.notes} onChange={set("notes")} className="mt-1" /></div>
        <div className="flex gap-3 justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSubmit(form)}>Save Changes</Button>
        </div>
      </div>
    </Dialog>
  );
}

function ExpenseFormDialog({ open, onClose, onSubmit, currency, loading }: any) {
  const initialForm = { amount: "", category: "FOOD", description: "", date: new Date().toISOString().split("T")[0], notes: "" };
  const [form, setForm] = useState(initialForm);
  const set = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));

  useEffect(() => {
    if (!open) setForm(initialForm);
  }, [open]);

  const submit = () => {
    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }
    onSubmit({ ...form, currency });
  };

  return (
    <Dialog open={open} onClose={onClose} title="Add Expense">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Amount *</Label><Input type="number" min="0.01" step="0.01" value={form.amount} onChange={set("amount")} className="mt-1" placeholder="100" /></div>
          <div><Label>Category</Label><Select value={form.category} onChange={set("category")} className="mt-1">
            <option value="ACCOMMODATION">Accommodation</option><option value="TRANSPORT">Transport</option>
            <option value="FOOD">Food</option><option value="ACTIVITIES">Activities</option>
            <option value="SHOPPING">Shopping</option><option value="MISCELLANEOUS">Misc</option>
          </Select></div>
        </div>
        <div><Label>Description</Label><Input value={form.description} onChange={set("description")} className="mt-1" placeholder="Optional, e.g. Lunch near city center" /></div>
        <div><Label>Date</Label><Input type="date" value={form.date} onChange={set("date")} className="mt-1" /></div>
        <div className="flex gap-3 justify-end pt-2"><Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button><Button onClick={submit} loading={loading}>Add</Button></div>
      </div>
    </Dialog>
  );
}

function BookingFormDialog({ open, onClose, onSubmit, initialData, title = "Add Booking" }: any) {
  const defaultForm = { type: "HOTEL", provider: "", bookingRef: "", url: "", status: "PENDING", checkIn: "", checkOut: "", amount: "", notes: "" };
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    if (initialData) {
      setForm({
        type: initialData.type || "HOTEL",
        provider: initialData.provider || "",
        bookingRef: initialData.bookingRef || "",
        url: initialData.url || "",
        status: initialData.status || "PENDING",
        checkIn: initialData.checkIn ? initialData.checkIn.split("T")[0] : "",
        checkOut: initialData.checkOut ? initialData.checkOut.split("T")[0] : "",
        amount: initialData.amount ? String(initialData.amount) : "",
        notes: initialData.notes || "",
      });
    } else {
      setForm(defaultForm);
    }
  }, [initialData, open]);

  const set = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Type</Label><Select value={form.type} onChange={set("type")} className="mt-1">
            <option value="HOTEL">Hotel</option><option value="FLIGHT">Flight</option><option value="TRAIN">Train</option>
            <option value="RESTAURANT">Restaurant</option><option value="TOUR">Tour</option><option value="OTHER">Other</option>
          </Select></div>
          <div><Label>Status</Label><Select value={form.status} onChange={set("status")} className="mt-1">
            <option value="PENDING">Pending</option><option value="CONFIRMED">Confirmed</option>
          </Select></div>
        </div>
        <div><Label>Provider *</Label><Input placeholder="Hilton, Turkish Airlines..." value={form.provider} onChange={set("provider")} className="mt-1" /></div>
        <div><Label>Booking Ref</Label><Input value={form.bookingRef} onChange={set("bookingRef")} className="mt-1" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Check In</Label><Input type="date" value={form.checkIn} onChange={set("checkIn")} className="mt-1" /></div>
          <div><Label>Check Out</Label><Input type="date" value={form.checkOut} onChange={set("checkOut")} className="mt-1" /></div>
        </div>
        <div><Label>Amount</Label><Input type="number" value={form.amount} onChange={set("amount")} className="mt-1" /></div>
        <div className="flex gap-3 justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSubmit(form)}>{initialData ? "Save Changes" : "Add"}</Button>
        </div>
      </div>
    </Dialog>
  );
}

function InviteFormDialog({ open, onClose, onSubmit }: any) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("VIEWER");
  return (
    <Dialog open={open} onClose={onClose} title="Invite Collaborator">
      <div className="space-y-3">
        <div><Label>Email *</Label><Input type="email" placeholder="friend@email.com" value={email} onChange={e => setEmail(e.target.value)} className="mt-1" /></div>
        <div><Label>Role</Label><Select value={role} onChange={e => setRole(e.target.value)} className="mt-1">
          <option value="VIEWER">Viewer</option><option value="EDITOR">Editor</option>
        </Select></div>
        <div className="flex gap-3 justify-end pt-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => { onSubmit(email, role); setEmail(""); }}>Send Invite</Button></div>
      </div>
    </Dialog>
  );
}

function AddItemDialog({ open, onClose, onSubmit }: any) {
  const [form, setForm] = useState({ title: "", description: "", timeSlot: "MORNING", startTime: "", endTime: "", estimatedCost: "0", category: "activity", location: "" });
  const set = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));
  return (
    <Dialog open={open} onClose={onClose} title="Add Activity">
      <div className="space-y-3">
        <div><Label>Title *</Label><Input value={form.title} onChange={set("title")} className="mt-1" placeholder="Visit museum..." /></div>
        <div><Label>Description</Label><Input value={form.description} onChange={set("description")} className="mt-1" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Time Slot</Label><Select value={form.timeSlot} onChange={set("timeSlot")} className="mt-1">
            <option value="MORNING">Morning</option><option value="AFTERNOON">Afternoon</option><option value="EVENING">Evening</option>
          </Select></div>
          <div><Label>Category</Label><Select value={form.category} onChange={set("category")} className="mt-1">
            <option value="activity">Activity</option><option value="landmark">Landmark</option><option value="museum">Museum</option>
            <option value="food">Food</option><option value="shopping">Shopping</option><option value="tour">Tour</option>
          </Select></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Start Time</Label><Input type="time" value={form.startTime} onChange={set("startTime")} className="mt-1" /></div>
          <div><Label>End Time</Label><Input type="time" value={form.endTime} onChange={set("endTime")} className="mt-1" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Est. Cost</Label><Input type="number" value={form.estimatedCost} onChange={set("estimatedCost")} className="mt-1" /></div>
          <div><Label>Location</Label><Input value={form.location} onChange={set("location")} className="mt-1" /></div>
        </div>
        <div className="flex gap-3 justify-end pt-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => onSubmit(form)}>Add Item</Button></div>
      </div>
    </Dialog>
  );
}
