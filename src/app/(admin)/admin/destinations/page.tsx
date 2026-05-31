"use client";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, Badge, Button, ConfirmDialog, Dialog, Input, Textarea, Select, Label } from "@/components/ui";
import { MapPinned, Loader2, Star, Plus, Pencil, Search, SlidersHorizontal, ShieldCheck, Settings2 } from "lucide-react";
import toast from "react-hot-toast";

const STYLES = ["ALL","BUDGET","BACKPACKER","MODERATE","FAMILY","ADVENTURE","CULTURAL","RELAXATION","LUXURY"];
const CATS = ["ALL","landmark","museum","park","restaurant","hotel","tour","beach","wellness","shopping","family","adventure","cultural","local"];

const emptyForm = {
  id: "", name: "", city: "", country: "", description: "", category: "landmark",
  latitude: 0, longitude: 0, rating: 4.5, priceLevel: 2, estimatedCost: 0, currency: "USD",
  imageUrl: "", tags: "MODERATE", openingHours: "Local demo hours", estimatedDuration: "1-3 hours",
  isFeatured: false, isActive: true,
};

function parseTags(tags: any) {
  try { return Array.isArray(tags) ? tags : JSON.parse(tags || "[]"); } catch { return String(tags || "").split(",").map((x) => x.trim()).filter(Boolean); }
}
function styleOf(d: any) {
  const tags = parseTags(d.tags).map((x: string) => x.toUpperCase());
  return STYLES.find((s) => s !== "ALL" && tags.includes(s)) || "GENERAL";
}

export default function AdminDestinationsPage(){
  const[rows,setRows]=useState<any[]>([]);
  const[loading,setLoading]=useState(true);
  const[pending,setPending]=useState<any|null>(null);
  const[formOpen,setFormOpen]=useState(false);
  const[form,setForm]=useState<any>(emptyForm);
  const[saving,setSaving]=useState(false);
  const[query,setQuery]=useState("");
  const[style,setStyle]=useState("ALL");
  const[category,setCategory]=useState("ALL");
  const[sort,setSort]=useState("rating-desc");
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";
  const [maxDestinations, setMaxDestinations] = useState<number>(50);
  const [showLimitEditor, setShowLimitEditor] = useState(false);

  const load=async()=>{setLoading(true);try{const r=await fetch('/api/admin?type=destinations');const d=await r.json();if(!r.ok)throw new Error(d?.error||'Destinations could not be loaded');setRows(Array.isArray(d)?d:[])}catch(e:any){toast.error(e.message||'Destinations could not be loaded');setRows([])}finally{setLoading(false)}};
  useEffect(()=>{load()},[]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = rows.filter((d) => {
      const tags = parseTags(d.tags).join(" ").toLowerCase();
      const matchesQ = !q || [d.name,d.city,d.country,d.category,d.description,tags].join(" ").toLowerCase().includes(q);
      const matchesStyle = style === "ALL" || parseTags(d.tags).map((x:string)=>x.toUpperCase()).includes(style);
      const matchesCat = category === "ALL" || d.category === category;
      return matchesQ && matchesStyle && matchesCat;
    });
    out.sort((a,b) => {
      if (sort === "rating-desc") return (b.rating||0)-(a.rating||0);
      if (sort === "cost-asc") return (a.estimatedCost||0)-(b.estimatedCost||0);
      if (sort === "cost-desc") return (b.estimatedCost||0)-(a.estimatedCost||0);
      return String(a.name).localeCompare(String(b.name));
    });
    return out;
  }, [rows, query, style, category, sort]);

  const openCreate=()=>{setForm({...emptyForm});setFormOpen(true)};
  const openEdit=(d:any)=>{setForm({...emptyForm,...d,tags:parseTags(d.tags).join(", ")});setFormOpen(true)};

  const save=async()=>{setSaving(true);try{const r=await fetch('/api/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:"destination",...form})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d?.error||'Destination save failed');toast.success(form.id?'Destination updated':'Destination created');setFormOpen(false);load()}catch(e:any){toast.error(e.message||'Destination save failed')}finally{setSaving(false)}};

  const toggle=async()=>{if(!pending)return;try{const r=await fetch('/api/admin',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({destinationId:pending.id,isActive:!pending.isActive})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d?.error||'Destination update failed');toast.success('Destination updated');setPending(null);load()}catch(e:any){toast.error(e.message||'Destination update failed')}};

  if(loading)return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>;
  return <div className="space-y-6 animate-fade-in">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-3"><MapPinned className="h-6 w-6 text-primary"/><div><h1 className="text-2xl font-bold font-display">Destination Catalog</h1><p className="text-sm text-muted-foreground">Create, edit, filter and manage local style-based destination records.</p></div></div>
      <div className="flex items-center gap-2">
        {!isSuperAdmin && (
          <div className="flex items-center gap-2">
            <button onClick={()=>setShowLimitEditor(!showLimitEditor)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors">
              <Settings2 className="h-3.5 w-3.5"/> Max Limit: {maxDestinations}
            </button>
            {showLimitEditor && (
              <div className="flex items-center gap-2 bg-card border rounded-lg px-3 py-1.5 shadow-lg">
                <span className="text-xs text-muted-foreground">Max active:</span>
                <input type="number" min={1} max={500} value={maxDestinations}
                  onChange={e=>setMaxDestinations(Number(e.target.value)||50)}
                  className="w-16 text-xs border rounded px-1.5 py-0.5 bg-background" />
                <button onClick={()=>setShowLimitEditor(false)} className="text-xs text-primary font-medium">Save</button>
              </div>
            )}
          </div>
        )}
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4"/> Add Destination</Button>
      </div>
    </div>

    <Card><CardContent className="p-4 grid md:grid-cols-4 gap-3">
      <div className="relative md:col-span-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input value={query} onChange={(e)=>setQuery(e.target.value)} className="pl-9" placeholder="Search destinations, tags..."/></div>
      <Select value={style} onChange={(e)=>setStyle(e.target.value)}>{STYLES.map(s=><option key={s} value={s}>{s==="ALL"?"All styles":s}</option>)}</Select>
      <Select value={category} onChange={(e)=>setCategory(e.target.value)}>{CATS.map(c=><option key={c} value={c}>{c==="ALL"?"All categories":c}</option>)}</Select>
      <Select value={sort} onChange={(e)=>setSort(e.target.value)}><option value="rating-desc">Rating high to low</option><option value="cost-asc">Cost low to high</option><option value="cost-desc">Cost high to low</option><option value="name-asc">Name A-Z</option></Select>
    </CardContent></Card>

    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><SlidersHorizontal className="h-4 w-4"/> Showing {filtered.length} of {rows.length} local destinations.</div>
      {!isSuperAdmin && rows.filter((d:any)=>d.isActive).length >= maxDestinations && (
        <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-2.5 py-1">
          <ShieldCheck className="h-3.5 w-3.5"/> Active destination limit ({maxDestinations}) reached
        </div>
      )}
    </div>

    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{filtered.map((d:any)=><Card key={d.id} className={!d.isActive?"opacity-70":""}><CardContent className="p-5 space-y-3">
      <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{d.name}</h3><p className="text-xs text-muted-foreground">{d.city}, {d.country} · {d.category}</p></div><Badge variant={d.isActive?'success':'secondary'}>{d.isActive?'Active':'Hidden'}</Badge></div>
      <p className="line-clamp-2 text-sm text-muted-foreground">{d.description}</p>
      <div className="flex flex-wrap gap-2">{parseTags(d.tags).slice(0,4).map((t:string)=><Badge key={t} variant={t.toUpperCase()===styleOf(d)?"default":"secondary"}>{t}</Badge>)}</div>
      <div className="flex items-center gap-4 text-sm"><span className="flex items-center gap-1"><Star className="h-4 w-4 text-yellow-500"/>{d.rating}</span><span>Level {d.priceLevel}</span><span>${d.estimatedCost||0}</span><span>{d._count?.reviews||0} reviews</span></div>
      <div className="flex gap-2"><Button variant="outline" size="sm" onClick={()=>openEdit(d)} className="gap-1"><Pencil className="h-3 w-3"/> Edit</Button><Button variant="outline" size="sm" onClick={()=>setPending(d)}>{d.isActive?'Hide':'Activate'}</Button></div>
    </CardContent></Card>)}
    {filtered.length===0&&<Card className="md:col-span-2 xl:col-span-3"><CardContent className="py-12 text-center text-sm text-muted-foreground">No destination matches the selected filters.</CardContent></Card>}
    </div>

    <Dialog open={formOpen} onClose={()=>setFormOpen(false)} title={form.id?"Edit Destination":"Create Destination"}>
      <div className="space-y-4">
        <div className="grid md:grid-cols-2 gap-3"><div><Label>Name</Label><Input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div><div><Label>Category</Label><Input value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/></div></div>
        <div className="grid md:grid-cols-2 gap-3"><div><Label>City</Label><Input value={form.city} onChange={e=>setForm({...form,city:e.target.value})}/></div><div><Label>Country</Label><Input value={form.country} onChange={e=>setForm({...form,country:e.target.value})}/></div></div>
        <div><Label>Description</Label><Textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div>
        <div><Label>Tags / Travel styles, comma separated</Label><Input value={form.tags} onChange={e=>setForm({...form,tags:e.target.value})} placeholder="LUXURY, FAMILY, beach, hotel"/></div>
        <div className="grid md:grid-cols-4 gap-3"><div><Label>Rating</Label><Input type="number" step="0.1" value={form.rating} onChange={e=>setForm({...form,rating:e.target.value})}/></div><div><Label>Price Level</Label><Input type="number" value={form.priceLevel} onChange={e=>setForm({...form,priceLevel:e.target.value})}/></div><div><Label>Cost</Label><Input type="number" value={form.estimatedCost} onChange={e=>setForm({...form,estimatedCost:e.target.value})}/></div><div><Label>Duration</Label><Input value={form.estimatedDuration||""} onChange={e=>setForm({...form,estimatedDuration:e.target.value})}/></div></div>
        <div className="grid md:grid-cols-2 gap-3"><div><Label>Latitude</Label><Input type="number" value={form.latitude} onChange={e=>setForm({...form,latitude:e.target.value})}/></div><div><Label>Longitude</Label><Input type="number" value={form.longitude} onChange={e=>setForm({...form,longitude:e.target.value})}/></div></div>
        <div><Label>Local image URL / SVG path</Label><Input value={form.imageUrl||""} onChange={e=>setForm({...form,imageUrl:e.target.value})} placeholder="/destinations/baku-old-city.svg"/></div>
        <div className="grid md:grid-cols-2 gap-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.isFeatured} onChange={e=>setForm({...form,isFeatured:e.target.checked})}/> Featured</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive!==false} onChange={e=>setForm({...form,isActive:e.target.checked})}/> Active</label></div>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={()=>setFormOpen(false)}>Cancel</Button><Button onClick={save} loading={saving}>{form.id?"Save Changes":"Create Destination"}</Button></div>
      </div>
    </Dialog>

    <ConfirmDialog open={!!pending} onClose={()=>setPending(null)} onConfirm={toggle} title="Update destination visibility" description={`${pending?.isActive?'Hide':'Activate'} ${pending?.name}? This changes what users see in Explore.`} confirmText={pending?.isActive?'Hide':'Activate'} variant={pending?.isActive?'destructive':'default'}/>
  </div>
}
