"use client";

import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, Select, Dialog } from "@/components/ui";
import { Settings, Lock, Bell, Trash2, Globe, Eye, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface NotifSettings {
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  tripReminders: boolean;
  budgetAlerts: boolean;
  collaborationUpdates: boolean;
  quietMode: boolean;
}

interface AppearanceSettings {
  language: string;
  dateFormat: string;
  defaultCurrency: string;
}

const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) => (
  <label className="flex items-center justify-between py-2.5 cursor-pointer select-none">
    <span className="text-sm">{label}</span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${checked ? "bg-primary" : "bg-muted"}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
    </button>
  </label>
);

export default function SettingsPage() {
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [savingPw, setSavingPw] = useState(false);
  const [savingNotif, setSavingNotif] = useState(false);
  const [savingApp, setSavingApp] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorSetupCode, setTwoFactorSetupCode] = useState("");
  const [twoFactorInput, setTwoFactorInput] = useState("");
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [sessionDays, setSessionDays] = useState(30);
  const [savingSessionDays, setSavingSessionDays] = useState(false);

  const [notifications, setNotifications] = useState<NotifSettings>({
    notificationsEnabled: true,
    emailNotifications: true,
    tripReminders: true,
    budgetAlerts: true,
    collaborationUpdates: true,
    quietMode: false,
  });

  const [appearance, setAppearance] = useState<AppearanceSettings>({
    language: "en",
    dateFormat: "MM/DD/YYYY",
    defaultCurrency: "USD",
  });

  // Load saved settings on mount
  useEffect(() => {
    fetch("/api/users/profile")
      .then(r => r.json())
      .then(data => {
        if (data?.sessionDays) setSessionDays(Number(data.sessionDays));
        const pref = data?.preference;
        if (pref) {
          setNotifications({
            notificationsEnabled: pref.notificationsEnabled ?? true,
            emailNotifications: pref.emailNotifications ?? true,
            tripReminders: pref.tripReminders ?? true,
            budgetAlerts: pref.budgetAlerts ?? true,
            collaborationUpdates: pref.collaborationUpdates ?? true,
            quietMode: pref.quietMode ?? false,
          });
          setAppearance({
            language: pref.language ?? "en",
            dateFormat: pref.dateFormat ?? "MM/DD/YYYY",
            defaultCurrency: pref.defaultCurrency ?? "USD",
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoadingSettings(false));

    fetch("/api/auth/2fa/status")
      .then(r => r.json())
      .then(data => setTwoFactorEnabled(!!data.twoFactorEnabled))
      .catch(() => {});
  }, []);

  const changePassword = async () => {
    if (!passwords.currentPassword || !passwords.newPassword) { toast.error("Fill all fields"); return; }
    if (passwords.newPassword.length < 8) { toast.error("Min 8 characters"); return; }
    if (passwords.newPassword !== passwords.confirmPassword) { toast.error("Passwords don't match"); return; }
    setSavingPw(true);
    const res = await fetch("/api/users/change-password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword }),
    });
    const data = await res.json();
    if (res.ok) { toast.success("Password changed!"); setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" }); }
    else toast.error(data.error || "Could not change password. Check your current password and new password rules.");
    setSavingPw(false);
  };

  const saveNotifications = async () => {
    setSavingNotif(true);
    const res = await fetch("/api/users/profile", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferences: notifications }),
    });
    if (res.ok) toast.success("Notification settings saved!");
    else toast.error("Could not save settings locally. Please try again.");
    setSavingNotif(false);
  };

  const saveAppearance = async () => {
    setSavingApp(true);
    const res = await fetch("/api/users/profile", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferences: appearance }),
    });
    if (res.ok) toast.success("Appearance settings saved!");
    else toast.error("Could not save settings locally. Please try again.");
    setSavingApp(false);
  };

  const saveSessionDuration = async () => {
    setSavingSessionDays(true);
    const res = await fetch("/api/users/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionDays }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      toast.success("Session duration saved. Sign out and back in to apply it to this login.");
    } else {
      toast.error(data.error || "Could not save session duration.");
    }
    setSavingSessionDays(false);
  };


  const startTwoFactorSetup = async () => {
    setTwoFactorLoading(true);
    const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setTwoFactorSetupCode(data.demoCode || "");
      toast.success("Local 2FA code generated");
    } else toast.error(data.error || "Could not generate local 2FA code. Please try again.");
    setTwoFactorLoading(false);
  };

  const confirmTwoFactor = async () => {
    if (!twoFactorInput) { toast.error("Enter the 6-digit code"); return; }
    setTwoFactorLoading(true);
    const res = await fetch("/api/auth/2fa/confirm", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: twoFactorInput }),
    });
    const data = await res.json();
    if (res.ok) {
      setTwoFactorEnabled(true);
      setTwoFactorSetupCode("");
      setTwoFactorInput("");
      toast.success("2FA enabled");
    } else toast.error(data.error || "Invalid 2FA code");
    setTwoFactorLoading(false);
  };

  const regenerateTwoFactor = async () => {
    setTwoFactorLoading(true);
    const res = await fetch("/api/auth/2fa/regenerate", { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setTwoFactorSetupCode(data.demoCode || "");
      toast.success("New local 2FA code generated");
    } else toast.error(data.error || "Could not regenerate local 2FA code. Please try again.");
    setTwoFactorLoading(false);
  };

  const disableTwoFactor = async () => {
    setTwoFactorLoading(true);
    const res = await fetch("/api/auth/2fa/disable", { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setTwoFactorEnabled(false);
      setTwoFactorSetupCode("");
      setTwoFactorInput("");
      toast.success("2FA disabled");
    } else toast.error(data.error || "Could not disable 2FA. Please try again.");
    setTwoFactorLoading(false);
  };

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

  if (loadingSettings) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" /> Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account, security, and preferences.</p>
      </div>

      {/* Security */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Lock className="h-5 w-5" /> Security</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Current Password</Label>
            <Input type="password" value={passwords.currentPassword} onChange={e => setPasswords(p => ({ ...p, currentPassword: e.target.value }))} className="mt-1.5" />
          </div>
          <div><Label>New Password</Label>
            <Input type="password" placeholder="Min 8 characters" value={passwords.newPassword} onChange={e => setPasswords(p => ({ ...p, newPassword: e.target.value }))} className="mt-1.5" />
          </div>
          <div><Label>Confirm New Password</Label>
            <Input type="password" value={passwords.confirmPassword} onChange={e => setPasswords(p => ({ ...p, confirmPassword: e.target.value }))} className="mt-1.5" />
          </div>
          <Button onClick={changePassword} loading={savingPw}>Change Password</Button>
        </CardContent>
      </Card>



      {/* Session Duration */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Lock className="h-5 w-5" /> Login Session Duration</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            Choose how long SmartTravel should keep you signed in on this device. This is a local demo setting and does not use any external auth service.
          </div>
          <div>
            <Label>Keep me signed in for</Label>
            <Select
              value={String(sessionDays)}
              onChange={e => setSessionDays(Number(e.target.value))}
              className="mt-1.5"
            >
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="120">120 days</option>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              New duration applies on the next login. The app enforces the selected duration locally.
            </p>
          </div>
          <Button onClick={saveSessionDuration} size="sm" loading={savingSessionDays}>Save Session Duration</Button>
        </CardContent>
      </Card>


      {/* Local 2FA */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Lock className="h-5 w-5" /> Local Demo 2FA</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="font-medium">Status: {twoFactorEnabled ? "Enabled" : "Disabled"}</p>
            <p className="text-muted-foreground mt-1">This is offline-safe 2FA. Codes are generated locally and printed in the terminal; for demo convenience they are also shown here.</p>
          </div>

          {!twoFactorEnabled && !twoFactorSetupCode && (
            <Button onClick={startTwoFactorSetup} loading={twoFactorLoading}>Enable Local 2FA</Button>
          )}

          {!twoFactorEnabled && twoFactorSetupCode && (
            <div className="space-y-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Demo setup code</p>
                <p className="text-2xl font-bold tracking-widest">{twoFactorSetupCode}</p>
              </div>
              <div>
                <Label>Confirm 2FA Code</Label>
                <Input
                  value={twoFactorInput}
                  onChange={e => setTwoFactorInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  className="mt-1.5"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={confirmTwoFactor} loading={twoFactorLoading}>Confirm & Enable</Button>
                <Button variant="outline" onClick={regenerateTwoFactor} disabled={twoFactorLoading}>Regenerate Code</Button>
              </div>
            </div>
          )}

          {twoFactorEnabled && (
            <div className="flex gap-2">
              <Button variant="destructive" onClick={disableTwoFactor} loading={twoFactorLoading}>Disable 2FA</Button>
              <Button variant="outline" onClick={regenerateTwoFactor} disabled={twoFactorLoading}>Generate Test Code</Button>
            </div>
          )}

          {twoFactorEnabled && twoFactorSetupCode && (
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Latest generated demo code</p>
              <p className="text-2xl font-bold tracking-widest">{twoFactorSetupCode}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Bell className="h-5 w-5" /> Notifications</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          <Toggle checked={notifications.notificationsEnabled} onChange={() => setNotifications(p => ({ ...p, notificationsEnabled: !p.notificationsEnabled }))} label="In-App Notifications" />
          <Toggle checked={notifications.emailNotifications} onChange={() => setNotifications(p => ({ ...p, emailNotifications: !p.emailNotifications }))} label="Email Notifications" />
          <Toggle checked={notifications.tripReminders} onChange={() => setNotifications(p => ({ ...p, tripReminders: !p.tripReminders }))} label="Trip Reminders" />
          <Toggle checked={notifications.budgetAlerts} onChange={() => setNotifications(p => ({ ...p, budgetAlerts: !p.budgetAlerts }))} label="Budget Alerts" />
          <Toggle checked={notifications.collaborationUpdates} onChange={() => setNotifications(p => ({ ...p, collaborationUpdates: !p.collaborationUpdates }))} label="Collaboration Updates" />
          <Toggle checked={notifications.quietMode} onChange={() => setNotifications(p => ({ ...p, quietMode: !p.quietMode }))} label="Quiet Mode (suppress all)" />
          <div className="pt-3">
            <Button onClick={saveNotifications} size="sm" loading={savingNotif}>Save Notification Settings</Button>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Eye className="h-5 w-5" /> Appearance & Locale</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Language</Label>
              <Select value={appearance.language} onChange={e => setAppearance(p => ({ ...p, language: e.target.value }))} className="mt-1.5">
                <option value="en">English</option>
                <option value="tr">Türkçe</option>
                <option value="az">Azərbaycanca</option>
              </Select>
            </div>
            <div><Label>Default Currency</Label>
              <Select value={appearance.defaultCurrency} onChange={e => setAppearance(p => ({ ...p, defaultCurrency: e.target.value }))} className="mt-1.5">
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="TRY">TRY (₺)</option>
                <option value="AZN">AZN (₼)</option>
              </Select>
            </div>
          </div>
          <div><Label>Date Format</Label>
            <Select value={appearance.dateFormat} onChange={e => setAppearance(p => ({ ...p, dateFormat: e.target.value }))} className="mt-1.5">
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </Select>
          </div>
          <Button onClick={saveAppearance} size="sm" loading={savingApp}>Save Appearance</Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/30">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base text-destructive"><Trash2 className="h-5 w-5" /> Danger Zone</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Deactivate your account and anonymize your personal data. Your trips and content will be preserved but disassociated. This cannot be undone.
          </p>
          <Button variant="destructive" onClick={() => setShowDeleteAccount(true)}>Delete My Account</Button>
        </CardContent>
      </Card>

      {/* Delete Account Dialog */}
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
