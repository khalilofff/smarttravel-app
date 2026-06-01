"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, Badge, Button, Input, Avatar, ConfirmDialog, Select } from "@/components/ui";
import { Search, UserX, UserCheck, Trash2, Loader2, Users, ShieldCheck, Eye, Crown, Lock } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

function RoleLabel({ role }: { role: string }) {
  if (role === "SUPER_ADMIN") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-600 border border-amber-500/30">
      <Crown className="h-3 w-3" /> Super Admin
    </span>
  );
  if (role === "MANAGER") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-600 border border-blue-500/30">
      <ShieldCheck className="h-3 w-3" /> Manager
    </span>
  );
  return <span className="text-xs text-muted-foreground">User</span>;
}

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const role = session?.user?.role || "USER";
  const isSuperAdmin = role === "SUPER_ADMIN";

  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirmAction, setConfirmAction] = useState<{ userId: string; action: string; name: string } | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const toggleSelected = (id: string) => setSelected((s) => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const fetchUsers = async (q = search, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/admin?type=users&search=${encodeURIComponent(q)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Users could not be loaded");
      setUsers(Array.isArray(data) ? data : []);
    } catch (e: any) {
      if (!silent) toast.error(e.message || "Users could not be loaded");
      if (!silent) setUsers([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(""); }, []);

  useEffect(() => {
    const refresh = () => fetchUsers(search, true);
    const interval = window.setInterval(refresh, 10000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(interval); window.removeEventListener("focus", refresh); };
  }, [search]);

  const runAction = async (userId: string, action: string) => {
    const res = await fetch("/api/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Admin action failed");
  };

  const handleAction = async () => {
    if (!confirmAction) return;
    try {
      await runAction(confirmAction.userId, confirmAction.action);
      toast.success(confirmAction.action === "delete" ? "User disabled safely" : "User updated");
      setConfirmAction(null);
      fetchUsers(search);
    } catch (e: any) {
      toast.error(e.message || "Admin action failed");
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!isSuperAdmin) { toast.error("Only Super Admin can change roles"); return; }
    let action = "MAKE_USER";
    if (newRole === "MANAGER") action = "MAKE_MANAGER";
    else if (newRole === "SUPER_ADMIN") action = "MAKE_SUPER_ADMIN";
    try {
      await runAction(userId, action);
      toast.success("Role updated");
      fetchUsers(search);
    } catch (e: any) {
      toast.error(e.message || "Role update failed");
    }
  };

  const runBulk = async (action: string) => {
    if (!selected.length) { toast.error("Select at least one user"); return; }
    try {
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: selected, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Bulk action failed");
      toast.success((data.count || selected.length) + " user(s) updated");
      setSelected([]); fetchUsers(search);
    } catch (e: any) { toast.error(e.message || "Bulk action failed"); }
  };

  // A user row is protected if Manager tries to act on non-USER
  const isProtected = (u: any) => !isSuperAdmin && (u.role === "MANAGER" || u.role === "SUPER_ADMIN");

  // Only super admin can select admin-level users
  const selectableUsers = isSuperAdmin ? users : users.filter((u: any) => u.role === "USER");

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold font-display">User Management</h1>
          <p className="text-sm text-muted-foreground">
            {isSuperAdmin
              ? "Manage all users, managers and roles across the platform."
              : "Manage regular users — activate, disable and view details."}
          </p>
        </div>
      </div>

      {!isSuperAdmin && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800 p-3 flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          You can manage regular users only. Role changes and admin user management require Super Admin access.
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or email..." value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && fetchUsers(search)} className="pl-9" />
        </div>
        <Button onClick={() => fetchUsers(search)} variant="outline">Search</Button>
        <Button onClick={() => runBulk("BULK_ENABLE")} variant="outline" disabled={!selected.length}>Enable Selected</Button>
        <Button onClick={() => runBulk("BULK_DISABLE")} variant="outline" disabled={!selected.length}>Disable Selected</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium w-10">
                      <input type="checkbox"
                        checked={selectableUsers.length > 0 && selected.length === selectableUsers.length}
                        onChange={(e) => setSelected(e.target.checked ? selectableUsers.map((u: any) => u.id) : [])} />
                    </th>
                    <th className="text-left p-3 font-medium">User</th>
                    <th className="text-left p-3 font-medium">Role</th>
                    <th className="text-left p-3 font-medium">Usage</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Joined</th>
                    <th className="text-right p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u: any) => {
                    const protected_ = isProtected(u);
                    return (
                      <tr key={u.id} className={`border-b last:border-0 hover:bg-muted/30 ${protected_ ? "opacity-70" : ""}`}>
                        <td className="p-3">
                          {!protected_ && (
                            <input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggleSelected(u.id)} />
                          )}
                          {protected_ && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Avatar name={u.name} size="sm" />
                            <div>
                              <p className="font-medium">{u.name || "Unnamed"}</p>
                              <p className="text-xs text-muted-foreground">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          {isSuperAdmin ? (
                            // Super Admin can change any role
                            u.role === "SUPER_ADMIN" ? (
                              <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
                                <Crown className="h-3.5 w-3.5" /> Super Admin
                              </span>
                            ) : (
                              <Select value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value)} className="h-8 w-32 text-xs">
                                <option value="USER">USER</option>
                                <option value="MANAGER">MANAGER</option>
                                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                              </Select>
                            )
                          ) : (
                            <RoleLabel role={u.role} />
                          )}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {u._count?.trips || 0} trips · {u._count?.bookings || 0} bookings · ${(u.budget?.balance || 0).toLocaleString()} budget
                        </td>
                        <td className="p-3">
                          {!u.isActive ? (
                            <Badge variant="destructive">Disabled</Badge>
                          ) : u.isOnline ? (
                            <Badge variant="success">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </td>
                        <td className="p-3 text-muted-foreground">{formatDate(u.createdAt)}</td>
                        <td className="p-3 text-right">
                          {protected_ ? (
                            <span className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                              <Lock className="h-3 w-3" /> Protected
                            </span>
                          ) : (
                            <div className="flex gap-1 justify-end">
                              <Link title="View details" href={`/admin/users/${u.id}`} className="p-1.5 rounded hover:bg-muted">
                                <Eye className="h-4 w-4" />
                              </Link>
                              {u.isActive
                                ? <button title="Disable user" onClick={() => setConfirmAction({ userId: u.id, action: "suspend", name: u.name || u.email })}
                                    className="p-1.5 rounded hover:bg-orange-100 dark:hover:bg-orange-900/30">
                                    <UserX className="h-4 w-4 text-orange-600" />
                                  </button>
                                : <button title="Activate user" onClick={() => setConfirmAction({ userId: u.id, action: "activate", name: u.name || u.email })}
                                    className="p-1.5 rounded hover:bg-green-100 dark:hover:bg-green-900/30">
                                    <UserCheck className="h-4 w-4 text-green-600" />
                                  </button>
                              }
                              <button title="Safe disable" onClick={() => setConfirmAction({ userId: u.id, action: "delete", name: u.name || u.email })}
                                className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30">
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {users.length === 0 && (
                <div className="text-center py-10">
                  <ShieldCheck className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No users found.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog open={!!confirmAction} onClose={() => setConfirmAction(null)} onConfirm={handleAction}
        title={`${confirmAction?.action === "delete" ? "Disable" : confirmAction?.action} User`}
        description={`${confirmAction?.action === "delete" ? "Safely disable" : confirmAction?.action} "${confirmAction?.name}"? User data will be preserved.`}
        confirmText={confirmAction?.action === "delete" ? "Disable" : "Confirm"}
        variant={confirmAction?.action === "delete" ? "destructive" : "default"} />
    </div>
  );
}
