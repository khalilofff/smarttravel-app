"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, Select, Avatar, Dialog } from "@/components/ui";
import { User, Settings, Bell, Lock, Trash2, Camera, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

const INTERESTS = ["Culture", "History", "Food", "Nature", "Adventure", "Nightlife", "Art", "Shopping", "Photography", "Sports", "Wellness", "Architecture", "Music", "Beach", "Mountains"];

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [profile, setProfile] = useState({ name: "", email: "" });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [prefs, setPrefs] = useState<any>({
    interests: [], travelStyle: "MODERATE", budgetStyle: "mid-range",
    preferredTransport: ["public_transit"], travelPace: "MODERATE",
    accommodationType: "HOTEL", dietaryRestrictions: [],
    notificationsEnabled: true, emailNotifications: true, quietMode: false,
  });

  useEffect(() => {
    fetch("/api/users/profile").then(r => r.json()).then(data => {
      setUser(data);
      setAvatarUrl(data.image || null);
      setProfile({ name: data.name || "", email: data.email || "" });
      if (data.preference) {
        const p = { ...data.preference };
        try { p.interests = JSON.parse(p.interests || "[]"); } catch { p.interests = []; }
        setPrefs(p);
      }
      setLoading(false);
    });
  }, []);

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("purpose", "profile");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) {
        const data = await res.json();
        setAvatarUrl(data.url);
        toast.success("Profile photo updated!");
        update(); // refresh session
      } else {
        const d = await res.json();
        toast.error(d.error || "Upload failed");
      }
    } catch { toast.error("Upload failed"); }
    finally { setUploadingAvatar(false); }
  };

  const saveProfile = async () => {
    setSaving(true);
    await fetch("/api/users/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) });
    toast.success("Profile updated");
    setSaving(false);
  };

  const savePreferences = async () => {
    setSaving(true);
    const { id, userId, createdAt, updatedAt, ...prefData } = prefs;
    prefData.interests = JSON.stringify(prefData.interests || []);
    prefData.preferredTransport = JSON.stringify(prefData.preferredTransport || []);
    prefData.dietaryRestrictions = JSON.stringify(prefData.dietaryRestrictions || []);
    prefData.accessibilityNeeds = JSON.stringify(prefData.accessibilityNeeds || []);
    await fetch("/api/users/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ preferences: prefData }) });
    toast.success("Preferences saved");
    setSaving(false);
  };

  const changePassword = async () => {
    if (!passwords.currentPassword || !passwords.newPassword) { toast.error("Fill all fields"); return; }
    if (passwords.newPassword.length < 8) { toast.error("Min 8 characters"); return; }
    if (passwords.newPassword !== passwords.confirmPassword) { toast.error("Passwords don't match"); return; }
    setSaving(true);
    const res = await fetch("/api/users/change-password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword }),
    });
    const data = await res.json();
    if (res.ok) { toast.success("Password changed!"); setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" }); }
    else toast.error(data.error || "Could not update profile. Check the fields and try again.");
    setSaving(false);
  };

  const removeAvatar = async () => {
    const res = await fetch("/api/users/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: null }) });
    if (res.ok) { setAvatarUrl(""); toast.success("Profile photo removed"); update(); }
    else toast.error("Profile photo could not be removed");
  };

  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  const deleteAccount = async () => {
    if (!deletePassword) { toast.error("Enter your password to confirm"); return; }
    setDeleting(true);
    const res = await fetch("/api/users/delete-account", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: deletePassword }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success("Account deleted. Signing out...");
      setTimeout(() => signOut({ redirect: false }).then(() => window.location.assign("/login")), 1500);
    } else {
      toast.error(data.error || "Could not delete account. Please try again.");
      setDeleting(false);
    }
  };

  const toggleInterest = (interest: string) => {
    setPrefs((p: any) => ({
      ...p,
      interests: (p.interests || []).includes(interest) ? p.interests.filter((i: string) => i !== interest) : [...(p.interests || []), interest],
    }));
  };

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-8 bg-muted rounded w-48" /><div className="h-64 bg-muted rounded" /></div>;

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <h1 className="text-2xl font-bold font-display">Profile & Settings</h1>

      <Card className="mobile-profile-card">
        <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="mobile-profile-row flex items-center gap-4 mb-4 min-w-0">
            <div className="relative">
              <Avatar name={profile.name} image={avatarUrl || undefined} size="lg" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 bg-primary text-white rounded-full p-1.5 hover:bg-primary/90 transition-colors shadow-md"
              >
                {uploadingAvatar ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
            </div>
            <div className="min-w-0 flex-1"><p className="font-semibold truncate">{profile.name}</p><p className="text-sm text-muted-foreground truncate">{profile.email}</p>
              {avatarUrl && <button type="button" onClick={removeAvatar} className="mt-2 block text-xs text-red-500 hover:underline">Remove profile photo</button>}
              {user?.role === "SUPER_ADMIN" && <span className="text-xs text-amber-500 font-medium">Super Admin</span>}
              {user?.role === "MANAGER" && <span className="text-xs text-primary font-medium">Manager</span>}
            </div>
          </div>
          <div><Label>Full Name</Label><Input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} className="mt-1" /></div>
          <div><Label>Email</Label><Input type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} className="mt-1" /></div>
          <Button onClick={saveProfile} loading={saving}>Save Profile</Button>
        </CardContent>
      </Card>

      {/* #27 Password Change */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" /> Change Password</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Current Password</Label><Input type="password" value={passwords.currentPassword} onChange={e => setPasswords(p => ({ ...p, currentPassword: e.target.value }))} className="mt-1" /></div>
          <div><Label>New Password</Label><Input type="password" placeholder="Min 8 characters" value={passwords.newPassword} onChange={e => setPasswords(p => ({ ...p, newPassword: e.target.value }))} className="mt-1" /></div>
          <div><Label>Confirm New Password</Label><Input type="password" value={passwords.confirmPassword} onChange={e => setPasswords(p => ({ ...p, confirmPassword: e.target.value }))} className="mt-1" /></div>
          <Button onClick={changePassword} loading={saving}>Change Password</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Travel Preferences</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Travel Interests</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {INTERESTS.map(i => (
                <button key={i} onClick={() => toggleInterest(i.toLowerCase())}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${(prefs.interests || []).includes(i.toLowerCase()) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                  {i}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Travel Style</Label><Select value={prefs.travelStyle} onChange={e => setPrefs((p: any) => ({ ...p, travelStyle: e.target.value }))} className="mt-1">
              <option value="BUDGET">Budget</option><option value="MODERATE">Moderate</option><option value="LUXURY">Luxury</option>
              <option value="BACKPACKER">Backpacker</option><option value="FAMILY">Family</option><option value="ADVENTURE">Adventure</option>
            </Select></div>
            <div><Label>Travel Pace</Label><Select value={prefs.travelPace} onChange={e => setPrefs((p: any) => ({ ...p, travelPace: e.target.value }))} className="mt-1">
              <option value="SLOW">Slow</option><option value="MODERATE">Moderate</option><option value="FAST">Fast</option><option value="PACKED">Packed</option>
            </Select></div>
          </div>
          <div><Label>Accommodation</Label><Select value={prefs.accommodationType} onChange={e => setPrefs((p: any) => ({ ...p, accommodationType: e.target.value }))} className="mt-1">
            <option value="HOTEL">Hotel</option><option value="HOSTEL">Hostel</option><option value="AIRBNB">Airbnb</option>
            <option value="RESORT">Resort</option><option value="BOUTIQUE">Boutique</option><option value="CAMPING">Camping</option>
          </Select></div>
          <Button onClick={savePreferences} loading={saving}>Save Preferences</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Notifications</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: "notificationsEnabled", label: "In-app Notifications" },
            { key: "emailNotifications", label: "Email Notifications" },
            { key: "quietMode", label: "Quiet Mode" },
          ].map(item => (
            <label key={item.key} className="flex items-center justify-between py-2">
              <span className="text-sm">{item.label}</span>
              <button onClick={() => setPrefs((p: any) => ({ ...p, [item.key]: !p[item.key] }))}
                className={`relative w-11 h-6 rounded-full transition-colors ${prefs[item.key] ? "bg-primary" : "bg-muted"}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${prefs[item.key] ? "translate-x-5" : ""}`} />
              </button>
            </label>
          ))}
          <Button onClick={savePreferences} loading={saving} size="sm">Save</Button>
        </CardContent>
      </Card>

      {/* #28 Delete Account */}
      <Card className="border-destructive/30">
        <CardHeader><CardTitle className="flex items-center gap-2 text-destructive"><Trash2 className="h-5 w-5" /> Danger Zone</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">Permanently deactivate your account and remove your personal data. This cannot be undone.</p>
          <Button variant="destructive" onClick={() => setShowDeleteAccount(true)}>Delete My Account</Button>
        </CardContent>
      </Card>

      <Dialog open={showDeleteAccount} onClose={() => { setShowDeleteAccount(false); setDeletePassword(""); }} title="Delete Account">
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <strong>Warning:</strong> This will permanently deactivate your account and remove your personal information. This cannot be undone.
          </div>
          <div>
            <Label>Enter your password to confirm</Label>
            <Input
              type="password"
              placeholder="Your current password"
              value={deletePassword}
              onChange={e => setDeletePassword(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => { setShowDeleteAccount(false); setDeletePassword(""); }}>Cancel</Button>
            <Button variant="destructive" onClick={deleteAccount} loading={deleting}>Delete Forever</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
