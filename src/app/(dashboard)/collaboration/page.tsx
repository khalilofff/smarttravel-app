"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, Badge, Avatar, Button, EmptyState } from "@/components/ui";
import { Users, Loader2, Check, X, MapPin, Calendar } from "lucide-react";
import { getStatusColor, formatDate } from "@/lib/utils";
import Link from "next/link";
import toast from "react-hot-toast";

export default function CollaborationPage() {
  const [trips, setTrips] = useState<any[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, "accept" | "decline" | null>>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch both in parallel — pending from dedicated endpoint, trips for shared list
      const [tripsRes, pendingRes] = await Promise.all([
        fetch("/api/trips"),
        fetch("/api/collaboration/pending"),
      ]);
      const [tripsData, pendingData] = await Promise.all([
        tripsRes.json(),
        pendingRes.json(),
      ]);
      setTrips(Array.isArray(tripsData) ? tripsData : []);
      setPendingInvites(Array.isArray(pendingData) ? pendingData : []);
    } catch {
      toast.error("Could not load local collaboration data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAccept = async (collabId: string) => {
    setActionLoading(prev => ({ ...prev, [collabId]: "accept" }));
    const res = await fetch("/api/collaboration", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collaboratorId: collabId, status: "ACCEPTED" }),
    });
    if (res.ok) {
      toast.success("Invitation accepted!");
      await fetchData();
    } else {
      toast.error("Could not accept this invite. Please try again.");
      setActionLoading(prev => ({ ...prev, [collabId]: null }));
    }
  };

  const handleDecline = async (collabId: string) => {
    setActionLoading(prev => ({ ...prev, [collabId]: "decline" }));
    const res = await fetch("/api/collaboration", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collaboratorId: collabId, status: "DECLINED" }),
    });
    if (res.ok) {
      toast.success("Invitation declined");
      await fetchData();
    } else {
      toast.error("Could not decline this invite. Please try again.");
      setActionLoading(prev => ({ ...prev, [collabId]: null }));
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const sharedTrips = trips.filter(t => t.collaborators?.length > 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold font-display">Collaboration</h1>

      {/* Pending Invitations — fetched from dedicated endpoint */}
      {pendingInvites.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Pending Invitations
              <Badge variant="default" className="text-xs">{pendingInvites.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingInvites.map((inv: any) => {
              const isAccepting = actionLoading[inv.id] === "accept";
              const isDeclining = actionLoading[inv.id] === "decline";
              const isBusy = isAccepting || isDeclining;
              const dest = inv.trip?.destinations?.[0];
              return (
                <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-background border gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={inv.trip?.user?.name} size="sm" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{inv.trip?.title}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs text-muted-foreground">
                          Invited by <span className="font-medium">{inv.trip?.user?.name}</span>
                        </p>
                        {dest && (
                          <p className="text-xs text-muted-foreground flex items-center gap-0.5">
                            <MapPin className="h-3 w-3" />{dest.name}, {dest.country}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Role: <span className="font-medium">{inv.role}</span>
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <Calendar className="h-3 w-3" />{formatDate(inv.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => handleAccept(inv.id)}
                      disabled={isBusy}
                      className="gap-1 min-w-[90px]"
                    >
                      {isAccepting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      {isAccepting ? "Accepting…" : "Accept"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDecline(inv.id)}
                      disabled={isBusy}
                      className="gap-1 min-w-[90px]"
                    >
                      {isDeclining ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                      {isDeclining ? "Declining…" : "Decline"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Shared Trips */}
      {sharedTrips.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No shared trips"
          description="Invite friends from your trip detail page to start collaborating!"
        />
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Shared Trips</h2>
          {sharedTrips.map(trip => (
            <Card key={trip.id} className="card-hover">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <Link href={`/trip/${trip.id}`} className="font-semibold text-lg hover:text-primary transition-colors">
                    {trip.title}
                  </Link>
                  <Badge className={getStatusColor(trip.status)}>{trip.status}</Badge>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">Team:</span>
                  {trip.collaborators?.map((c: any) => (
                    <div key={c.id} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted text-xs">
                      <Avatar name={c.user?.name} size="sm" />
                      <span>{c.user?.name}</span>
                      <Badge variant="outline" className="text-[9px] px-1">{c.role}</Badge>
                      <Badge className={getStatusColor(c.status)} variant="outline">{c.status}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

