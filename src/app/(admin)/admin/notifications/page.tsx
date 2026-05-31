"use client";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Textarea, Select, Label, Badge } from "@/components/ui";
import { Bell, Loader2, Send, Users, CheckCircle2, Link2 } from "lucide-react";
import toast from "react-hot-toast";
import { formatDate } from "@/lib/utils";

export default function AdminNotificationsPage(){
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
  const[users,setUsers]=useState<any[]>([]); const[activity,setActivity]=useState<any>(null); const[loading,setLoading]=useState(true);
  const[target,setTarget]=useState("all"); const[selected,setSelected]=useState<string[]>([]); const[title,setTitle]=useState("System announcement"); const[message,setMessage]=useState("New local demo data and tools are available in SmartTravel."); const[link,setLink]=useState("/notifications"); const[sending,setSending]=useState(false);
  const linkOptions = [
    { value: "", label: "No link - just show message" },
    { value: "/notifications", label: "Notifications page" },
    { value: "/dashboard", label: "User dashboard" },
    { value: "/trips", label: "My trips" },
    { value: "/bookings", label: "Bookings" },
    { value: "/budget", label: "Budget" },
    { value: "/budget", label: "Budget" },
    { value: "/activity", label: "Activity" },
    { value: "/profile", label: "Profile" },
  ];
  const load=async()=>{setLoading(true);try{const [u,a]=await Promise.all([fetch('/api/admin?type=users').then(r=>r.json()),fetch('/api/admin?type=activity').then(r=>r.json())]);setUsers(Array.isArray(u)?u:[]);setActivity(a)}catch{toast.error('Notification data could not be loaded')}finally{setLoading(false)}};
  useEffect(()=>{load()},[]);
  const activeUsers=useMemo(()=>users.filter(u=>u.isActive),[users]);
  const toggle=(id:string)=>setSelected((s)=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
  const send=async()=>{setSending(true);try{const r=await fetch('/api/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'notification',target,userIds:selected,title,message,link})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Notification could not be sent');toast.success('Notification sent to '+d.count+' user(s)');setSelected([]);load()}catch(e:any){toast.error(e.message||'Notification could not be sent')}finally{setSending(false)}};
  if(loading)return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>;
  return <div className="space-y-6 animate-fade-in">
    <div className="flex items-center gap-3"><Bell className="h-6 w-6 text-primary"/><div><h1 className="text-2xl font-bold font-display">Admin Notification Center</h1><p className="text-sm text-muted-foreground">{isSuperAdmin ? 'Send in-app announcements to all users or admins.' : 'Send in-app announcements to regular users only.'}</p></div></div>
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2"><CardHeader><CardTitle className="flex items-center gap-2"><Send className="h-5 w-5"/> Compose announcement</CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-3"><div><Label>Target</Label><Select value={target} onChange={e=>setTarget(e.target.value)}><option value="all">All active users</option><option value="selected">Selected users only</option></Select></div><div><Label>Open when clicked</Label><Select value={link} onChange={e=>setLink(e.target.value)}>{linkOptions.map((o)=><option key={o.value || 'none'} value={o.value}>{o.label}</option>)}</Select></div></div>
        <div className="rounded-xl border border-border bg-muted/35 p-3 text-xs text-muted-foreground flex items-start gap-2"><Link2 className="h-4 w-4 mt-0.5 text-primary"/><span>{link ? <>Selected notification link: <b className="text-foreground">{link}</b></> : 'No redirect will be added. The user will only see the notification message.'}</span></div>
        <div><Label>Title</Label><Input value={title} onChange={e=>setTitle(e.target.value)} /></div>
        <div><Label>Message</Label><Textarea value={message} onChange={e=>setMessage(e.target.value)} rows={4}/></div>
        {target==='selected'&&<div className="rounded-xl border p-3 max-h-64 overflow-y-auto"><div className="flex items-center justify-between mb-2"><p className="text-sm font-medium">Select users</p><Badge>{selected.length} selected</Badge></div>{activeUsers.map(u=><label key={u.id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm"><span><b>{u.name||'Unnamed'}</b><span className="text-muted-foreground ml-2">{u.email}</span></span><input type="checkbox" checked={selected.includes(u.id)} onChange={()=>toggle(u.id)}/></label>)}</div>}
        <Button onClick={send} loading={sending} disabled={!title.trim()||!message.trim()||(target==='selected'&&!selected.length)} className="gap-2"><Send className="h-4 w-4"/> Send Notification</Button>
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5"/> Delivery summary</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><div className="flex justify-between"><span>Active users</span><b>{activeUsers.length}</b></div><div className="flex justify-between"><span>Selected</span><b>{selected.length}</b></div><div className="flex justify-between"><span>Recent notifications</span><b>{activity?.notifications?.length||0}</b></div><p className="text-xs text-muted-foreground">This is a local-only notification system. It does not send real email, SMS, or push messages.</p></CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle className="text-base">Recent notification records</CardTitle></CardHeader><CardContent className="space-y-2">{(activity?.notifications||[]).slice(0,10).map((n:any)=><div key={n.id} className="flex items-start gap-3 rounded-xl border p-3"><CheckCircle2 className="h-4 w-4 text-green-500 mt-1"/><div className="flex-1"><p className="font-medium text-sm">{n.title}</p><p className="text-xs text-muted-foreground">{n.user?.email} · {formatDate(n.createdAt)}</p><p className="text-sm mt-1">{n.message}</p></div><Badge variant={n.isRead?'secondary':'default'}>{n.isRead?'Read':'Unread'}</Badge></div>)}{(!activity?.notifications||activity.notifications.length===0)&&<p className="text-sm text-muted-foreground text-center py-8">No notifications yet.</p>}</CardContent></Card>
  </div>
}
