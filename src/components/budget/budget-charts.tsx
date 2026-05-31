"use client";

import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const CATEGORY_COLORS: Record<string, string> = {
  ACCOMMODATION: "#3b82f6",
  TRANSPORT: "#22c55e",
  FOOD: "#f97316",
  ACTIVITIES: "#a855f7",
  SHOPPING: "#ec4899",
  MISCELLANEOUS: "#6b7280",
};

const formatLabel = (cat: string) =>
  cat.toLowerCase().replace("_", " ").replace(/^\w/, c => c.toUpperCase());

interface BudgetChartsProps {
  budgetCategories: {
    id: string;
    category: string;
    planned: number;
    spent: number;
  }[];
  currency?: string;
}

export default function BudgetCharts({ budgetCategories, currency = "USD" }: BudgetChartsProps) {
  if (!budgetCategories || budgetCategories.length === 0) return null;

  const pieData = budgetCategories
    .filter(cat => cat.spent > 0)
    .map(cat => ({
      name: formatLabel(cat.category),
      value: cat.spent,
      color: CATEGORY_COLORS[cat.category] || "#6b7280",
    }));

  const barData = budgetCategories.map(cat => ({
    name: formatLabel(cat.category),
    Planned: cat.planned,
    Actual: cat.spent,
  }));

  const formatAmount = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Pie Chart — Category Breakdown */}
      {pieData.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Spending by Category</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(((percent ?? 0) as number) * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => formatAmount(Number(value || 0))} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Bar Chart — Planned vs Actual */}
      <div>
        <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Planned vs Actual</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10 }}
              tickFormatter={v => v.slice(0, 6)}
            />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${v}`} />
            <Tooltip formatter={(value: any) => formatAmount(Number(value || 0))} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Planned" fill="#6366f1" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Actual" fill="#f97316" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
