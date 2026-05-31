"use client";

import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui";
import { MapPin, Navigation, Route } from "lucide-react";

interface MapPoint {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  category?: string;
  dayNumber?: number;
  timeSlot?: string;
}

function project(points: MapPoint[], point: MapPoint) {
  const lats = points.map(p => p.latitude);
  const lngs = points.map(p => p.longitude);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const x = maxLng === minLng ? 50 : 8 + ((point.longitude - minLng) / (maxLng - minLng)) * 84;
  const y = maxLat === minLat ? 50 : 92 - ((point.latitude - minLat) / (maxLat - minLat)) * 84;
  return { x, y };
}

function estimateDistanceKm(points: MapPoint[]) {
  if (points.length < 2) return 0;
  const toRad = (n: number) => (n * Math.PI) / 180;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const R = 6371;
    const dLat = toRad(b.latitude - a.latitude);
    const dLng = toRad(b.longitude - a.longitude);
    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    total += 2 * R * Math.asin(Math.sqrt(h));
  }
  return Math.round(total * 10) / 10;
}

export default function TripMap({ points, title = "Trip Route Map" }: { points: MapPoint[]; title?: string }) {
  if (points.length === 0) {
    return (
      <Card><CardContent className="p-8 text-center">
        <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No locations to display. Generate an itinerary or add destinations first.</p>
      </CardContent></Card>
    );
  }

  const projected = points.map(p => ({ ...p, ...project(points, p) }));
  const polyline = projected.map(p => `${p.x},${p.y}`).join(" ");
  const distance = estimateDistanceKm(points);
  const time = distance ? Math.max(10, Math.round(distance * 3)) : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2"><Navigation className="h-5 w-5" /> {title}</CardTitle>
          <div className="flex gap-2">
            <Badge variant="secondary">route preview</Badge>
            <Badge variant="secondary">{points.length} stops</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative h-[450px] rounded-xl overflow-hidden border bg-slate-900">
          <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(rgba(148,163,184,.25) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,.25) 1px, transparent 1px)", backgroundSize: "42px 42px" }} />
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
            <polyline points={polyline} fill="none" stroke="currentColor" strokeWidth="0.6" strokeDasharray="2 2" className="text-blue-400" />
          </svg>
          {projected.map((p, i) => (
            <div key={p.id} className="absolute -translate-x-1/2 -translate-y-1/2 group" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
              <div className="h-9 w-9 rounded-full bg-blue-600 text-white border-2 border-white shadow-lg flex items-center justify-center text-xs font-bold">{i + 1}</div>
              <div className="absolute left-1/2 top-11 -translate-x-1/2 hidden group-hover:block z-10 w-52 rounded-lg border bg-card p-3 shadow-xl text-xs">
                <div className="font-semibold text-sm">{p.title}</div>
                <div className="text-muted-foreground">{p.category || "Destination"}{p.dayNumber ? ` • Day ${p.dayNumber}` : ""}</div>
                <div className="text-muted-foreground">{p.latitude.toFixed(4)}, {p.longitude.toFixed(4)}</div>
              </div>
            </div>
          ))}
          <div className="absolute bottom-4 left-4 right-4 rounded-xl border bg-card/95 p-3 flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2"><Route className="h-4 w-4 text-primary" /> Route estimate</span>
            <span>{distance} km</span>
            <span>{time} min</span>
            <a className="text-primary font-medium" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/${points.map(p => `${p.latitude},${p.longitude}`).join("/")}`}>Open in Google Maps</a>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mt-3">
          {projected.map((p, i) => <div key={p.id} className="text-xs text-muted-foreground"><span className="font-medium text-foreground">{i + 1}.</span> {p.title}</div>)}
        </div>
      </CardContent>
    </Card>
  );
}
