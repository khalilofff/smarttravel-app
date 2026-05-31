"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, Select, EmptyState, ProgressBar, StatCard, Dialog, Input, Label, Button } from "@/components/ui";
import { PiggyBank, TrendingUp, PieChart, Loader2, AlertTriangle, Plus, Trash2, Edit, Check, X, Lightbulb } from "lucide-react";
import { formatCurrency, getBudgetPercentage, formatDate } from "@/lib/utils";
import BudgetCharts from "@/components/budget/budget-charts";
import toast from "react-hot-toast";


const CATEGORY_COLORS: Record<string, string> = {
  ACCOMMODATION: "bg-blue-500", TRANSPORT: "bg-green-500", FOOD: "bg-orange-500",
  ACTIVITIES: "bg-purple-500", SHOPPING: "bg-pink-500", MISCELLANEOUS: "bg-gray-500",
};

export default function BudgetPage() {
  const searchParams = useSearchParams();
  const [trips, setTrips] = useState<any[]>([]);
  const [selectedTrip, setSelectedTrip] = useState(searchParams.get("tripId") || "");
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Expense form
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [expenseForm, setExpenseForm] = useState({
    amount: "", category: "FOOD", description: "", date: new Date().toISOString().split("T")[0], notes: "",
  });

  // Budget edit
  const [editingBudget, setEditingBudget] = useState(false);
  const [newBudget, setNewBudget] = useState("");

  // Suggestions
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const fetchTrips = useCallback(async () => {
    const res = await fetch("/api/trips");
    if (res.ok) setTrips(await res.json());
    setLoading(false);
  }, []);

  const fetchTrip = useCallback(async (id: string) => {
    const res = await fetch(`/api/trips/${id}`);
    if (res.ok) setTrip(await res.json());
  }, []);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);

  useEffect(() => {
    if (!selectedTrip) { setTrip(null); return; }
    fetchTrip(selectedTrip);
  }, [selectedTrip, fetchTrip]);

  useEffect(() => {
    if (!selectedTrip || !trip) { setSuggestions([]); return; }
    setSuggestionsLoading(true);
    fetch(`/api/budget/suggestions?tripId=${selectedTrip}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.suggestions) setSuggestions(data.suggestions); })
      .catch(() => {})
      .finally(() => setSuggestionsLoading(false));
  }, [selectedTrip, trip]);

  const totalSpent = trip?.expenses?.reduce((s: number, e: any) => s + e.amount, 0) || 0;
  const budgetPct = trip ? getBudgetPercentage(totalSpent, trip.totalBudget) : 0;
  const remaining = trip ? trip.totalBudget - totalSpent : 0;

  const setEF = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setExpenseForm(p => ({ ...p, [k]: e.target.value }));

  const openEdit = (exp: any) => {
    setEditingExpense(exp);
    setExpenseForm({
      amount: String(exp.amount),
      category: exp.category,
      description: exp.description,
      date: new Date(exp.date).toISOString().split("T")[0],
      notes: exp.notes || "",
    });
    setShowAddExpense(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.amount || Number(expenseForm.amount) <= 0) { toast.error("Enter a valid amount"); return; }
    if (!expenseForm.description) { toast.error("Enter a description"); return; }

    if (editingExpense) {
      const res = await fetch(`/api/expenses/${editingExpense.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...expenseForm, amount: Number(expenseForm.amount) }),
      });
      if (res.ok) { toast.success("Expense updated!"); }
      else { toast.error("Could not update this expense. Check the fields and try again."); return; }
    } else {
      const res = await fetch("/api/budget/expenses", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...expenseForm, tripId: selectedTrip, amount: Number(expenseForm.amount) }),
      });
      if (res.ok) { toast.success("Expense added!"); }
      else { const d = await res.json(); toast.error(d.error || "Could not add expense. Check amount, category, and selected trip."); return; }
    }

    setShowAddExpense(false);
    setEditingExpense(null);
    setExpenseForm({ amount: "", category: "FOOD", description: "", date: new Date().toISOString().split("T")[0], notes: "" });
    fetchTrip(selectedTrip);
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Expense deleted"); fetchTrip(selectedTrip); }
    else toast.error("Could not delete this expense. Please try again.");
  };

  const handleUpdateBudget = async () => {
    const amount = Number(newBudget);
    if (!amount || amount <= 0) { toast.error("Enter a valid budget"); return; }
    const res = await fetch(`/api/trips/${selectedTrip}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ totalBudget: amount }),
    });
    if (res.ok) { toast.success("Budget updated!"); setEditingBudget(false); fetchTrip(selectedTrip); }
    else toast.error("Could not update budget category. Please try again.");
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold font-display">AI Budget Plan</h1>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={selectedTrip} onChange={e => setSelectedTrip(e.target.value)} className="flex-1 sm:w-64">
            <option value="">Select a trip</option>
            {trips.map((t: any) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </Select>
          {selectedTrip && trip && (
            <Button onClick={() => { setShowAddExpense(true); setEditingExpense(null); setExpenseForm({ amount: "", category: "FOOD", description: "", date: new Date().toISOString().split("T")[0], notes: "" }); }} className="gap-1 shrink-0">
              <Plus className="h-4 w-4" /> Expense
            </Button>
          )}
        </div>
      </div>

      {!selectedTrip || !trip ? (
        <EmptyState icon={PiggyBank} title="Select a trip" description="Choose a trip to view and manage its budget." />
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">Total Budget</p>
                <button onClick={() => { setEditingBudget(!editingBudget); setNewBudget(String(trip.totalBudget)); }} className="p-1 rounded hover:bg-muted">
                  <Edit className="h-3 w-3 text-muted-foreground" />
                </button>
              </div>
              {editingBudget ? (
                <div className="flex items-center gap-1 mt-1">
                  <Input type="number" value={newBudget} onChange={e => setNewBudget(e.target.value)} className="h-7 text-sm px-2" autoFocus />
                  <button onClick={handleUpdateBudget} className="p-1 rounded hover:bg-green-100 text-green-600"><Check className="h-4 w-4" /></button>
                  <button onClick={() => setEditingBudget(false)} className="p-1 rounded hover:bg-red-100 text-red-500"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <p className="text-xl font-bold">{formatCurrency(trip.totalBudget, trip.currency)}</p>
              )}
            </div>
            <StatCard title="Total Spent" value={formatCurrency(totalSpent, trip.currency)} icon={TrendingUp} />
            <StatCard title="Remaining" value={formatCurrency(Math.max(0, remaining), trip.currency)} icon={PieChart} />
            <StatCard title="Budget Used" value={`${budgetPct}%`} icon={budgetPct >= 90 ? AlertTriangle : PiggyBank} />
          </div>

          {/* Overall progress */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium">Overall Budget</span>
                <span className="text-sm font-semibold">{formatCurrency(totalSpent, trip.currency)} / {formatCurrency(trip.totalBudget, trip.currency)}</span>
              </div>
              <ProgressBar value={totalSpent} max={trip.totalBudget} className="h-3" />
              {budgetPct >= 90 && (
                <div className="flex items-center gap-2 mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                  <p className="text-sm text-red-700 dark:text-red-400">
                    {budgetPct >= 100 ? "You've exceeded your budget!" : `Warning: ${budgetPct}% of budget used.`}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Category breakdown */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trip.budgetCategories?.map((cat: any) => {
              const pct = getBudgetPercentage(cat.spent, cat.planned);
              return (
                <Card key={cat.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-3 h-3 rounded-full ${CATEGORY_COLORS[cat.category] || "bg-gray-500"}`} />
                      <span className="font-medium text-sm capitalize">{cat.category.toLowerCase().replace("_", " ")}</span>
                      <span className={`ml-auto text-xs font-semibold ${pct >= 100 ? "text-red-500" : "text-muted-foreground"}`}>{pct}%</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Spent</span>
                      <span className="font-semibold">{formatCurrency(cat.spent, trip.currency)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Planned</span>
                      <span>{formatCurrency(cat.planned, trip.currency)}</span>
                    </div>
                    <ProgressBar value={cat.spent} max={cat.planned} />
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Budget Suggestions */}
          {(suggestions.length > 0 || suggestionsLoading) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" /> AI Budget Guidance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {suggestionsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Analysing your AI budget plan...
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {suggestions.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm rounded-xl bg-muted/50 px-3 py-2.5">
                        <span className="mt-0.5 shrink-0 text-base leading-none">{s.split(" ")[0]}</span>
                        <span>{s.split(" ").slice(1).join(" ")}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}

          {/* Charts */}
          <Card>
            <CardHeader><CardTitle>Spending Charts</CardTitle></CardHeader>
            <CardContent>
              <BudgetCharts budgetCategories={trip.budgetCategories || []} currency={trip.currency} />
            </CardContent>
          </Card>

          {/* Expense Log with Edit/Delete */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Expense Log ({trip.expenses?.length || 0})</CardTitle>
              <Button size="sm" onClick={() => { setShowAddExpense(true); setEditingExpense(null); setExpenseForm({ amount: "", category: "FOOD", description: "", date: new Date().toISOString().split("T")[0], notes: "" }); }} className="gap-1">
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </CardHeader>
            <CardContent>
              {!trip.expenses || trip.expenses.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-3">No expenses recorded yet.</p>
                  <Button size="sm" variant="outline" onClick={() => setShowAddExpense(true)}>Add First Expense</Button>
                </div>
              ) : (
                <div className="space-y-1">
                  {trip.expenses.map((exp: any) => (
                    <div key={exp.id} className="flex items-center gap-3 py-2.5 border-b last:border-0 group">
                      <div className={`w-1.5 h-10 rounded-full shrink-0 ${CATEGORY_COLORS[exp.category] || "bg-gray-500"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{exp.description}</p>
                        <p className="text-xs text-muted-foreground capitalize">{exp.category?.toLowerCase().replace("_", " ")} · {formatDate(exp.date)}</p>
                      </div>
                      <span className="text-sm font-semibold">{formatCurrency(exp.amount, exp.currency)}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(exp)} className="p-1.5 rounded hover:bg-muted"><Edit className="h-3.5 w-3.5 text-muted-foreground" /></button>
                        <button onClick={() => handleDeleteExpense(exp.id)} className="p-1.5 rounded hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Add/Edit Expense Dialog */}
      <Dialog
        open={showAddExpense}
        onClose={() => { setShowAddExpense(false); setEditingExpense(null); }}
        title={editingExpense ? "Edit Expense" : "Add Expense"}
      >
        <form onSubmit={handleSaveExpense} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Amount *</Label><Input type="number" step="0.01" min={0.01} placeholder="0.00" value={expenseForm.amount} onChange={setEF("amount")} className="mt-1" required /></div>
            <div><Label>Category</Label>
              <Select value={expenseForm.category} onChange={setEF("category")} className="mt-1">
                <option value="ACCOMMODATION">Accommodation</option>
                <option value="TRANSPORT">Transport</option>
                <option value="FOOD">Food</option>
                <option value="ACTIVITIES">Activities</option>
                <option value="SHOPPING">Shopping</option>
                <option value="MISCELLANEOUS">Miscellaneous</option>
              </Select>
            </div>
          </div>
          <div><Label>Description *</Label><Input placeholder="What did you spend on?" value={expenseForm.description} onChange={setEF("description")} className="mt-1" required /></div>
          <div><Label>Date</Label><Input type="date" value={expenseForm.date} onChange={setEF("date")} className="mt-1" /></div>
          <div><Label>Notes</Label><Input placeholder="Optional notes" value={expenseForm.notes} onChange={setEF("notes")} className="mt-1" /></div>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => { setShowAddExpense(false); setEditingExpense(null); }}>Cancel</Button>
            <Button type="submit">{editingExpense ? "Save Changes" : "Add Expense"}</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
