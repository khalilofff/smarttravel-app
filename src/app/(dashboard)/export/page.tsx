"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle, Label, Select, EmptyState } from "@/components/ui";
import { Download } from "lucide-react";
import toast from "react-hot-toast";

export default function ExportPage() {
  const searchParams = useSearchParams();
  const tripId = searchParams.get("tripId") || "";
  const [inputTripId, setInputTripId] = useState(tripId);
  const [trips, setTrips] = useState<any[]>([]);
  const [format, setFormat] = useState("pdf");
  const [loading, setLoading] = useState(false);
  const [exportData, setExportData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/trips").then(r => r.ok ? r.json() : []).then(data => {
      setTrips(data);
      if (!inputTripId && data.length > 0) setInputTripId(data[0].id);
    });
  }, []);

  const handleExport = async () => {
    if (!inputTripId) { toast.error("Select a trip first"); return; }
    setLoading(true);

    try {
    if (format === "csv") {
      const res = await fetch(`/api/export?tripId=${inputTripId}&format=csv`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || "Could not export this trip. Please select a valid trip and try again.");
        setLoading(false);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "expenses.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV downloaded!");
    } else {
      // Fetch data for PDF
      const res = await fetch(`/api/export?tripId=${inputTripId}&format=json`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || "Could not load this trip for PDF export. Please select another trip.");
        setLoading(false);
        return;
      }
      const data = await res.json();

      // PDF export should always work in the local demo. If itinerary is empty,
      // the PDF still includes trip overview, budget, bookings, and a note.
      if (!data.itinerary || data.itinerary.length === 0) {
        toast("No itinerary found. Exporting trip overview, budget, and bookings only.");
      }

      setExportData(data);
      // Generate PDF client-side
      await generatePDF(data);
    }
    } catch (err: any) {
      console.error("Export failed", err);
      toast.error(err?.message || "Export failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async (data: any) => {
    const { jsPDF } = await import("jspdf");
    const autoTableModule = await import("jspdf-autotable");

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 16;
    let y = 18;

    const safe = (v: any) => String(v ?? "").replace(/\s+/g, " ").trim();
    const addPageIfNeeded = (needed = 20) => {
      if (y + needed > pageH - 18) {
        doc.addPage();
        y = 18;
        drawHeader(false);
      }
    };
    const drawHeader = (first = false) => {
      doc.setFillColor(5, 7, 13);
      doc.rect(0, 0, pageW, first ? 34 : 14, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(first ? 18 : 10);
      doc.text(first ? "SmartTravel Trip Plan" : safe(data.trip.title || "SmartTravel Trip Plan"), margin, first ? 14 : 9);
      doc.setTextColor(120, 171, 171);
      doc.setFontSize(9);
      if (first) doc.text("AI travel planning summary", margin, 23);
      doc.setTextColor(20, 20, 20);
    };
    const section = (title: string) => {
      addPageIfNeeded(18);
      y += 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(5, 7, 13);
      doc.text(title, margin, y);
      y += 7;
      doc.setDrawColor(128, 171, 171);
      doc.line(margin, y - 2, pageW - margin, y - 2);
    };
    const paragraph = (text: string, indent = 0, size = 10) => {
      const lines = doc.splitTextToSize(safe(text), pageW - margin * 2 - indent);
      addPageIfNeeded(lines.length * 5 + 2);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(size);
      doc.setTextColor(45, 55, 72);
      doc.text(lines, margin + indent, y);
      y += Math.max(5, lines.length * 5) + 1;
    };
    const autoTableExport = (autoTableModule as any).default || (autoTableModule as any).autoTable || (doc as any).autoTable;
    const runTable = (options: any) => {
      if (typeof (doc as any).autoTable === "function") return (doc as any).autoTable(options);
      if (typeof autoTableExport === "function") return autoTableExport(doc, options);
      throw new Error("PDF table engine could not load.");
    };

    drawHeader(true);
    y = 43;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(5, 7, 13);
    doc.text(safe(data.trip.title || "Trip Plan"), margin, y);
    y += 10;

    const overviewRows = [
      ["Destination", safe(data.trip.destination)],
      ["Dates", safe(data.trip.dates)],
      ["Budget", `${safe(data.trip.budget)} | Spent: ${safe(data.trip.spent)}`],
      ["Travelers / Style", `${safe(data.trip.travelers)} traveler(s) | ${safe(data.trip.style)}`],
      ["Status", safe(data.trip.status || "Planned")],
    ];
    runTable({
      startY: y,
      head: [["Trip Overview", ""]],
      body: overviewRows,
      theme: "grid",
      margin: { left: margin, right: margin },
      styles: { font: "helvetica", fontSize: 10, cellPadding: 3, overflow: "linebreak", valign: "top" },
      headStyles: { fillColor: [5, 7, 13], textColor: 255, fontStyle: "bold" },
      columnStyles: { 0: { cellWidth: 42, fontStyle: "bold", textColor: [5, 7, 13] }, 1: { cellWidth: pageW - margin * 2 - 42 } },
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    section("Day-by-Day Itinerary");
    for (const day of data.itinerary || []) {
      addPageIfNeeded(22);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(5, 7, 13);
      const dayTitle = `Day ${day.day}: ${safe(day.title || "Plan")}`;
      doc.text(doc.splitTextToSize(dayTitle, pageW - margin * 2), margin, y);
      y += Math.max(6, doc.splitTextToSize(dayTitle, pageW - margin * 2).length * 5);
      if (day.date) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(90, 100, 110);
        doc.text(safe(day.date), margin, y);
        y += 5;
      }
      const rows = (day.items || []).length
        ? day.items.map((i: any) => [safe(i.time || ""), safe(i.title), safe(i.cost || ""), safe(i.status || "")])
        : [["", "No itinerary items saved for this day.", "", ""]];
      runTable({
        startY: y,
        head: [["Time", "Activity", "Cost", "Status"]],
        body: rows,
        theme: "grid",
        margin: { left: margin, right: margin },
        styles: { font: "helvetica", fontSize: 9, cellPadding: 2.5, overflow: "linebreak", valign: "top" },
        headStyles: { fillColor: [128, 171, 171], textColor: [5, 7, 13], fontStyle: "bold" },
        columnStyles: { 0: { cellWidth: 24 }, 1: { cellWidth: pageW - margin * 2 - 74 }, 2: { cellWidth: 25, halign: "right" }, 3: { cellWidth: 25 } },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    section("Budget Breakdown");
    runTable({
      startY: y,
      head: [["Category", "Planned", "Spent"]],
      body: (data.budget || []).map((c: any) => [safe(c.category), safe(c.planned), safe(c.spent)]),
      theme: "grid",
      margin: { left: margin, right: margin },
      styles: { font: "helvetica", fontSize: 10, cellPadding: 3, overflow: "linebreak" },
      headStyles: { fillColor: [5, 7, 13], textColor: 255 },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    section("Bookings / External Options");
    runTable({
      startY: y,
      head: [["Type", "Provider", "Status", "Reference"]],
      body: (data.bookings || []).map((b: any) => [safe(b.type || "-"), safe(b.provider), safe(b.status), safe(b.ref)]),
      theme: "grid",
      margin: { left: margin, right: margin },
      styles: { font: "helvetica", fontSize: 9.5, cellPadding: 3, overflow: "linebreak", valign: "top" },
      headStyles: { fillColor: [128, 171, 171], textColor: [5, 7, 13] },
      columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: pageW - margin * 2 - 88 }, 2: { cellWidth: 28 }, 3: { cellWidth: 32 } },
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    if (data.collaborators?.length > 0) {
      section("Collaborators");
      runTable({
        startY: y,
        head: [["Name", "Email", "Role"]],
        body: data.collaborators.map((c: any) => [safe(c.name), safe(c.email), safe(c.role)]),
        theme: "grid",
        margin: { left: margin, right: margin },
        styles: { font: "helvetica", fontSize: 9.5, cellPadding: 3, overflow: "linebreak" },
        headStyles: { fillColor: [5, 7, 13], textColor: 255 },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    }

    const pageCount = (doc as any).getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text("Generated by SmartTravel — AI Travel Planning Platform", margin, pageH - 8);
      doc.text(`Page ${i} / ${pageCount}`, pageW - margin - 22, pageH - 8);
    }

    doc.save(`${safe(data.trip.title || "trip").replace(/[^a-z0-9-_]+/gi, "_")}-plan.pdf`);
    toast.success("PDF downloaded!");
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <h1 className="text-2xl font-bold font-display">Export Trip</h1>
      <p className="text-muted-foreground text-sm">Download your trip plan as PDF or expense data as CSV.</p>

      <Card>
        <CardHeader><CardTitle>Export Options</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Select Trip</Label>
            <Select value={inputTripId} onChange={e => setInputTripId(e.target.value)} className="mt-1.5">
              <option value="">Choose a trip</option>
              {trips.map(t => <option key={t.id} value={t.id}>{t.title} — {t.destinations?.[0]?.name || "No destination"}</option>)}
            </Select>
            <p className="text-xs text-muted-foreground mt-1">No manual Trip ID needed. This list comes from your local database.</p>
          </div>
          <div>
            <Label>Format</Label>
            <Select value={format} onChange={e => setFormat(e.target.value)} className="mt-1.5">
              <option value="pdf">PDF — Full Trip Plan</option>
              <option value="csv">CSV — Expense Data</option>
            </Select>
          </div>
          <Button onClick={handleExport} loading={loading} className="gap-2 w-full" size="lg">
            <Download className="h-4 w-4" /> Export {format.toUpperCase()}
          </Button>
        </CardContent>
      </Card>


    </div>
  );
}
