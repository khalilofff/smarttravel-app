"use client";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, Badge, Select, Input } from "@/components/ui";
import { Plane, Loader2, Search } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

const statuses=["ALL","DRAFT","PLANNED","ACTIVE","COMPLETED","CANCELLED","ARCHIVED"];
const styles=["ALL","BUDGET","BACKPACKER","MODERATE","FAMILY","ADVENTURE","CULTURAL","RELAXATION","LUXURY"];

export default function AdminTripsPage(){
  const[rows,setRows]=useState<any[]>([]);
  const[loading,setLoading]=useState(true);
  const[query,setQuery]=useState("");
  const[statusFilter,setStatusFilter]=useState("ALL");
  const[styleFilter,setStyleFilter]=useState("ALL");
  const[sort,setSort]=useState("date-desc");

  const load=()=>{setLoading(true);fetch('/api/admin?type=trips').then(r=>r.json()).then(d=>{setRows(Array.isArray(d)?d:[]);setLoading(false)}).catch(()=>{toast.error('Trips could not be loaded');setLoading(false)})};
  useEffect(load,[]);
  const update=async(id:string,status:string)=>{const r=await fetch('/api/admin',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({tripId:id,status})});if(r.ok){toast.success('Trip status updated');load()}else toast.error('Could not update trip')};

  const filtered=useMemo(()=>{
    const q=query.toLowerCase().trim();
    const out=rows.filter((t:any)=>{
      const matchesQ=!q||[t.title,t.travelStyle,t.status,t.user?.name,t.user?.email].join(' ').toLowerCase().includes(q);
      const matchesStatus=statusFilter==="ALL"||t.status===statusFilter;
      const matchesStyle=styleFilter==="ALL"||t.travelStyle===styleFilter;
      return matchesQ&&matchesStatus&&matchesStyle;
    });
    out.sort((a:any,b:any)=>{
      if(sort==="budget-desc") return (b.totalBudget||0)-(a.totalBudget||0);
      if(sort==="budget-asc") return (a.totalBudget||0)-(b.totalBudget||0);
      if(sort==="style") return String(a.travelStyle).localeCompare(String(b.travelStyle));
      return new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime();
    });
    return out;
  },[rows,query,statusFilter,styleFilter,sort]);

  if(loading)return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>;
  return <div className="space-y-6 animate-fade-in">
    <div className="flex items-center gap-3"><Plane className="h-6 w-6 text-primary"/><div><h1 className="text-2xl font-bold font-display">Trip Control</h1><p className="text-sm text-muted-foreground">All trips, owners, travel styles, dates, budgets and status control.</p></div></div>
    <Card><CardContent className="p-4 grid md:grid-cols-4 gap-3"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input className="pl-9" placeholder="Search trips, owners..." value={query} onChange={e=>setQuery(e.target.value)}/></div><Select value={styleFilter} onChange={e=>setStyleFilter(e.target.value)}>{styles.map(s=><option key={s} value={s}>{s==="ALL"?"All styles":s}</option>)}</Select><Select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>{statuses.map(s=><option key={s} value={s}>{s==="ALL"?"All statuses":s}</option>)}</Select><Select value={sort} onChange={e=>setSort(e.target.value)}><option value="date-desc">Newest first</option><option value="budget-desc">Budget high to low</option><option value="budget-asc">Budget low to high</option><option value="style">Style A-Z</option></Select></CardContent></Card>
    <Card><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/40"><th className="p-3 text-left">Trip</th><th className="p-3 text-left">Owner</th><th className="p-3 text-left">Dates</th><th className="p-3 text-right">Budget</th><th className="p-3 text-left">Usage</th><th className="p-3 text-left">Status</th></tr></thead><tbody>{filtered.map((t:any)=><tr key={t.id} className="border-b last:border-0 hover:bg-muted/20"><td className="p-3"><p className="font-medium">{t.title}</p><div className="mt-1 flex gap-2"><Badge>{t.travelStyle}</Badge><Badge variant="secondary">{t.travelerCount} traveler(s)</Badge></div></td><td className="p-3 text-muted-foreground">{t.user?.name||t.user?.email}</td><td className="p-3 text-muted-foreground">{formatDate(t.startDate)} → {formatDate(t.endDate)}</td><td className="p-3 text-right font-semibold">{formatCurrency(t.totalBudget||0)}</td><td className="p-3 text-xs text-muted-foreground">{t._count?.destinations||0} destinations · {t._count?.bookings||0} bookings · {t._count?.expenses||0} expenses</td><td className="p-3"><Select value={t.status} onChange={(e)=>update(t.id,e.target.value)} className="h-9 w-36">{statuses.filter(s=>s!=="ALL").map(s=><option key={s} value={s}>{s}</option>)}</Select></td></tr>)}</tbody></table>{filtered.length===0&&<p className="text-sm text-muted-foreground text-center py-10">No trips match your filters.</p>}</div></CardContent></Card>
  </div>
}
