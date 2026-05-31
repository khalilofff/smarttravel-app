"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, Badge, ProgressBar } from "@/components/ui";
import { Sparkles, Loader2, MapPinned, Plane, Users } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const STYLE_NOTES: Record<string,string> = {
  BUDGET: "Low-cost stays, free attractions, public transport and street food.",
  BACKPACKER: "Hostels, walking routes, markets and flexible multi-stop movement.",
  MODERATE: "Balanced hotels, paid activities, restaurants and comfortable pacing.",
  FAMILY: "Safe locations, family hotels, parks, aquariums and child-friendly timing.",
  ADVENTURE: "Outdoor tours, hiking, active routes and higher activity allocation.",
  CULTURAL: "Museums, historic districts, guided cultural sites and local cuisine.",
  RELAXATION: "Spa, wellness, beach, slow pacing and comfort-focused plans.",
  LUXURY: "Premium hotels, private transfers, fine dining and high-end experiences.",
};

export default function TravelStyleComparisonPage(){
  const[rows,setRows]=useState<any[]>([]);
  const[loading,setLoading]=useState(true);
  useEffect(()=>{fetch('/api/admin?type=styles').then(r=>r.json()).then(d=>{setRows(Array.isArray(d)?d:[]);setLoading(false)}).catch(()=>setLoading(false))},[]);
  if(loading)return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>;
  const maxBudget=Math.max(1,...rows.map(r=>r.totalBudget||0));
  return <div className="space-y-6 animate-fade-in">
    <div className="flex items-center gap-3"><Sparkles className="h-6 w-6 text-primary"/><div><h1 className="text-2xl font-bold font-display">Travel Style Comparison</h1><p className="text-sm text-muted-foreground">Compare travel styles by Budget, Moderate, Family, Luxury and other travel styles.</p></div></div>
    <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">{rows.map((s:any)=><Card key={s.style} className="overflow-hidden"><CardHeader><div className="flex items-center justify-between"><CardTitle className="text-base">{s.style}</CardTitle><Badge>{s.destinations?.length||0} places</Badge></div></CardHeader><CardContent className="space-y-4">
      <p className="text-sm text-muted-foreground min-h-[60px]">{STYLE_NOTES[s.style]||"Local demo style."}</p>
      <div className="grid grid-cols-3 gap-2 text-center text-sm"><div className="rounded-lg bg-muted p-2"><Users className="h-4 w-4 mx-auto mb-1 text-primary"/><b>{s.users}</b><p className="text-[10px] text-muted-foreground">users</p></div><div className="rounded-lg bg-muted p-2"><Plane className="h-4 w-4 mx-auto mb-1 text-primary"/><b>{s.trips}</b><p className="text-[10px] text-muted-foreground">trips</p></div><div className="rounded-lg bg-muted p-2"><MapPinned className="h-4 w-4 mx-auto mb-1 text-primary"/><b>{s.destinations?.length||0}</b><p className="text-[10px] text-muted-foreground">dest.</p></div></div>
      <div><div className="flex justify-between text-xs mb-1"><span>Total budget</span><span>{formatCurrency(s.totalBudget||0)}</span></div><ProgressBar value={s.totalBudget||0} max={maxBudget}/></div>
      <div className="space-y-1">{(s.destinations||[]).slice(0,4).map((d:any)=><div key={d.id} className="flex items-center justify-between text-xs"><span>{d.name}</span><span className="text-muted-foreground">${d.estimatedCost||0}</span></div>)}</div>
    </CardContent></Card>)}</div>
  </div>
}
