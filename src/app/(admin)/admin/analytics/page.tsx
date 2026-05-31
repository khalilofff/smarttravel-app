"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, StatCard, Badge } from "@/components/ui";
import { BarChart3, Users, Plane, DollarSign, Loader2, ClipboardList, MapPinned } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

function getCount(s:any){return typeof s._count==="number"?s._count:(s._count?.id??s._count?._all??0)}
function BarList({title, rows, labelKey="status", valueKey="_count"}:{title:string;rows:any[];labelKey?:string;valueKey?:string}) {
  const max=Math.max(1,...(rows||[]).map((r:any)=> valueKey==="_count"?getCount(r):(Number(r[valueKey])||0)));
  return <Card><CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader><CardContent className="space-y-3">{(rows||[]).map((r:any)=>{const value=valueKey==="_count"?getCount(r):(Number(r[valueKey])||0);return <div key={r[labelKey]||r.style||r.name}><div className="flex justify-between text-sm mb-1"><span>{r[labelKey]||r.style||r.name}</span><span className="font-semibold">{valueKey==="amount"?formatCurrency(value):value}</span></div><div className="h-3 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{width:`${Math.max(8,(value/max)*100)}%`}}/></div></div>})}{(!rows||rows.length===0)&&<p className="text-sm text-muted-foreground text-center py-6">No data yet.</p>}</CardContent></Card>
}
export default function AdminAnalyticsPage(){
  const[stats,setStats]=useState<any>(null);
  const[analytics,setAnalytics]=useState<any>(null);
  const[styles,setStyles]=useState<any[]>([]);
  const[loading,setLoading]=useState(true);
  useEffect(()=>{Promise.all([fetch('/api/admin?type=stats').then(r=>r.json()),fetch('/api/admin?type=analytics').then(r=>r.json()),fetch('/api/admin?type=styles').then(r=>r.json())]).then(([s,a,sty])=>{setStats(s.stats||{});setAnalytics(a);setStyles(Array.isArray(sty)?sty:[]);setLoading(false)}).catch(()=>setLoading(false))},[]);
  if(loading)return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>;
  const styleRows=styles.map((s:any)=>({style:s.style, trips:s.trips, amount:s.totalBudget||0, users:s.users, destinations:s.destinations?.length||0}));
  return <div className="space-y-6 animate-fade-in">
    <div className="flex items-center gap-3"><BarChart3 className="h-6 w-6 text-primary"/><div><h1 className="text-2xl font-bold font-display">Analytics</h1><p className="text-sm text-muted-foreground">Analytics for users, trips, bookings, styles and destination catalog usage.</p></div></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4"><StatCard title="Total Users" value={stats?.totalUsers||0} icon={Users}/><StatCard title="Total Trips" value={stats?.totalTrips||0} icon={Plane}/><StatCard title="Bookings" value={stats?.totalBookings||0} icon={ClipboardList}/><StatCard title="Booking Value" value={formatCurrency(stats?.totalRevenue||0)} icon={DollarSign}/></div>
    <div className="grid lg:grid-cols-4 gap-4"><StatCard title="Planned Budgets" value={formatCurrency(stats?.plannedBudget||stats?.totalBudget||0)} subtitle="Across user trips" icon={BarChart3}/><StatCard title="Catalog" value={stats?.totalDestinations||0} subtitle={`${stats?.activeDestinations||0} active`} icon={MapPinned}/><StatCard title="Activity Logs" value={stats?.txCount||stats?.userLogCount||0} subtitle="System audit records" icon={BarChart3}/><StatCard title="Alerts" value={stats?.unreadNotifications||0} subtitle="Unread local notifications" icon={BarChart3}/></div>
    <div className="grid lg:grid-cols-3 gap-6"><BarList title="Trip Status" rows={analytics?.tripsByStatus||[]}/><BarList title="Booking Status" rows={analytics?.bookingsByStatus||[]}/></div>
    <div className="grid lg:grid-cols-2 gap-6"><BarList title="Trips by Travel Style" rows={styleRows} labelKey="style" valueKey="trips"/><BarList title="Budget by Travel Style" rows={styleRows} labelKey="style" valueKey="amount"/></div>
    <Card><CardHeader><CardTitle className="text-base">Style Coverage Matrix</CardTitle></CardHeader><CardContent className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/40"><th className="p-3 text-left">Style</th><th className="p-3 text-right">Users</th><th className="p-3 text-right">Trips</th><th className="p-3 text-right">Destinations</th><th className="p-3 text-right">Total Budget</th></tr></thead><tbody>{styleRows.map((r:any)=><tr key={r.style} className="border-b last:border-0"><td className="p-3"><Badge>{r.style}</Badge></td><td className="p-3 text-right">{r.users}</td><td className="p-3 text-right">{r.trips}</td><td className="p-3 text-right">{r.destinations}</td><td className="p-3 text-right font-semibold">{formatCurrency(r.amount||0)}</td></tr>)}</tbody></table></CardContent></Card>
    <Card><CardHeader><CardTitle className="text-base">Top Destinations</CardTitle></CardHeader><CardContent className="space-y-3">{(analytics?.topDestinations||[]).map((d:any,i:number)=><div key={d.name} className="flex items-center gap-3"><span className="w-6 text-sm text-muted-foreground">{i+1}</span><span className="w-48 text-sm">{d.name}</span><div className="flex-1 h-6 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary/80 rounded-full text-right pr-2 text-xs font-bold text-primary-foreground" style={{width:`${Math.max(10,(d._count/((analytics.topDestinations[0]?._count)||1))*100)}%`}}>{d._count}</div></div></div>)}{(!analytics?.topDestinations||analytics.topDestinations.length===0)&&<p className="text-sm text-muted-foreground text-center py-6">No data yet.</p>}</CardContent></Card>
  </div>
}
