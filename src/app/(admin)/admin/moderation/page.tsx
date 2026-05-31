"use client";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Select } from "@/components/ui";
import { Flag, Shield, AlertTriangle, CheckCircle, Loader2, RefreshCw, Eye, X } from "lucide-react";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

const REASON_LABELS: Record<string, string> = {
  SPAM: "Spam",
  INAPPROPRIATE: "Inappropriate",
  OFFENSIVE: "Offensive",
  OTHER: "Other",
};

const TYPE_LABELS: Record<string, string> = {
  REVIEW: "Review",
  COMMENT: "Comment",
  TRIP: "Trip",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  RESOLVED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  DISMISSED: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

export default function AdminModerationPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [resolving, setResolving] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?status=${statusFilter}`);
      if (res.ok) setReports(await res.json());
      else toast.error("Could not load reports");
    } catch { toast.error("Failed to fetch reports"); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const updateStatus = async (reportId: string, status: string, action: "NONE" | "REMOVE_TARGET" = "NONE") => {
    setResolving(reportId);
    try {
      const res = await fetch("/api/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, status, action }),
      });
      if (res.ok) { toast.success(action === "REMOVE_TARGET" ? "Report resolved and target content moderated" : `Report marked as ${status.toLowerCase()}`); fetchReports(); }
      else { const d = await res.json(); toast.error(d.error || "Could not update report"); }
    } catch { toast.error("Failed to update report"); }
    finally { setResolving(null); }
  };

  const pending = reports.filter(r => r.status === "PENDING").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Flag className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold font-display">Content Moderation</h1>
            <p className="text-sm text-muted-foreground">Review reported trips, comments and reviews. Resolve only, dismiss, or moderate the target content.</p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchReports} className="gap-2"><RefreshCw className="h-4 w-4" /> Refresh</Button>
      </div>

      {/* Summary cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <div><p className="text-2xl font-bold">{pending}</p><p className="text-xs text-muted-foreground">Pending Reports</p></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div><p className="text-2xl font-bold">{reports.filter(r => r.status === "RESOLVED").length}</p><p className="text-xs text-muted-foreground">Resolved</p></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Shield className="h-5 w-5 text-gray-600" />
              </div>
              <div><p className="text-2xl font-bold">{reports.filter(r => r.status === "DISMISSED").length}</p><p className="text-xs text-muted-foreground">Dismissed</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Flag className="h-5 w-5" /> Report Queue</CardTitle>
            <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-36">
              <option value="ALL">All Reports</option>
              <option value="PENDING">Pending</option>
              <option value="RESOLVED">Resolved</option>
              <option value="DISMISSED">Dismissed</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-lg mb-1">
                {statusFilter === "PENDING" ? "No Pending Reports" : "No Reports Found"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {statusFilter === "PENDING" ? "All content is clear — no items need review." : "Try changing the filter above."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div key={report.id} className="rounded-xl border p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary">{TYPE_LABELS[report.targetType] || report.targetType}</Badge>
                      <Badge className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        report.reason === "OFFENSIVE" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" :
                        report.reason === "SPAM" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" :
                        "bg-muted text-muted-foreground"
                      }`}>{REASON_LABELS[report.reason] || report.reason}</Badge>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[report.status] || ""}`}>{report.status}</span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{formatDate(report.createdAt)}</span>
                  </div>

                  <div className="text-sm text-muted-foreground space-y-1">
                    <p><span className="font-medium text-foreground">Reporter:</span> {report.reporter?.name || "Unknown"} ({report.reporter?.email})</p>
                    <p><span className="font-medium text-foreground">Target:</span> {report.targetPreview?.title || "Preview unavailable"}</p>
                    {report.targetPreview?.owner && <p><span className="font-medium text-foreground">Author/Owner:</span> {report.targetPreview.owner}</p>}
                    {report.targetPreview?.destination && <p><span className="font-medium text-foreground">Destination:</span> {report.targetPreview.destination}</p>}
                    {report.targetPreview?.content && (
                      <div className="rounded-lg bg-muted/50 p-3 text-foreground">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Content preview</p>
                        <p className="line-clamp-3">{report.targetPreview.content}</p>
                      </div>
                    )}
                    <p><span className="font-medium text-foreground">Target ID:</span> <code className="text-xs bg-muted px-1 rounded">{report.targetId}</code></p>
                    {report.details && <p><span className="font-medium text-foreground">Reporter details:</span> {report.details}</p>}
                  </div>

                  {report.status === "PENDING" && (
                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <Button
                        size="sm" variant="outline"
                        className="gap-1.5 text-green-700 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-950"
                        loading={resolving === report.id}
                        onClick={() => updateStatus(report.id, "RESOLVED")}
                      >
                        <CheckCircle className="h-3.5 w-3.5" /> Resolve Only
                      </Button>
                      <Button
                        size="sm" variant="outline"
                        className="gap-1.5 text-red-700 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950"
                        loading={resolving === report.id}
                        onClick={() => updateStatus(report.id, "RESOLVED", "REMOVE_TARGET")}
                      >
                        <Eye className="h-3.5 w-3.5" /> Moderate Target
                      </Button>
                      <Button
                        size="sm" variant="outline"
                        className="gap-1.5 text-muted-foreground"
                        loading={resolving === report.id}
                        onClick={() => updateStatus(report.id, "DISMISSED")}
                      >
                        <X className="h-3.5 w-3.5" /> Dismiss
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
