import { useState, useEffect } from "react";
import { api } from "../../api/client";
import type { UserDto } from "../../types";

type FilterTab = "all" | "admin" | "active" | "inactive";

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {children}
    </span>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function UserManagement() {
  const [users,   setUsers]   = useState<UserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [filter,  setFilter]  = useState<FilterTab>("all");
  const [search,  setSearch]  = useState("");
  const [busy,    setBusy]    = useState<string | null>(null);
  const [toast,   setToast]   = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      setLoading(true);
      const list = await api.listUsers();
      setUsers(list);
    } catch {
      setError("Failed to load users. Make sure you are logged in as admin.");
    } finally {
      setLoading(false);
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function handlePromote(user: UserDto) {
    if (!confirm(`Promote "${user.name}" to admin? This action cannot be reversed.`)) return;
    setBusy(user.id);
    try {
      const updated = await api.promoteUser(user.id);
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
      showToast(`${user.name} promoted to admin.`);
    } catch {
      showToast("Failed to promote user.");
    } finally {
      setBusy(null);
    }
  }

  async function handleToggleActive(user: UserDto) {
    const action = user.active ? "deactivate" : "activate";
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} "${user.name}"?`)) return;
    setBusy(user.id);
    try {
      const updated = user.active
        ? await api.deactivateUser(user.id)
        : await api.activateUser(user.id);
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
      showToast(`${user.name} ${action}d.`);
    } catch {
      showToast(`Failed to ${action} user.`);
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete(user: UserDto) {
    if (!confirm(`Permanently delete "${user.name}"? This cannot be undone.`)) return;
    setBusy(user.id);
    try {
      await api.deleteUser(user.id);
      setUsers(prev => prev.filter(u => u.id !== user.id));
      showToast(`${user.name} deleted.`);
    } catch {
      showToast("Failed to delete user.");
    } finally {
      setBusy(null);
    }
  }

  const filtered = users.filter(u => {
    if (filter === "admin"    && !u.admin)   return false;
    if (filter === "active"   && !u.active)  return false;
    if (filter === "inactive" &&  u.active)  return false;
    if (search) {
      const q = search.toLowerCase();
      return u.name.toLowerCase().includes(q) ||
             (u.email ?? "").toLowerCase().includes(q) ||
             (u.roleName ?? "").toLowerCase().includes(q);
    }
    return true;
  });

  const tabs: { id: FilterTab; label: string; count: number }[] = [
    { id: "all",      label: "All Users",  count: users.length },
    { id: "admin",    label: "Admins",     count: users.filter(u => u.admin).length },
    { id: "active",   label: "Active",     count: users.filter(u => u.active).length },
    { id: "inactive", label: "Inactive",   count: users.filter(u => !u.active).length },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-slate-800 text-white text-sm px-5 py-3 rounded-xl shadow-xl animate-fade-in">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage registered users, promote to admin, and control access.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Users",   value: users.length,                        icon: "👥" },
          { label: "Admins",        value: users.filter(u => u.admin).length,   icon: "🛡️" },
          { label: "Active",        value: users.filter(u => u.active).length,  icon: "✅" },
          { label: "Inactive",      value: users.filter(u => !u.active).length, icon: "🔒" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 px-4 py-4">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-2xl font-bold text-slate-800">{s.value}</div>
            <div className="text-xs text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs + search */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-slate-100">
          <div className="flex gap-1 flex-wrap">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  filter === t.id
                    ? "bg-purple-600 text-white"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {t.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  filter === t.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                }`}>{t.count}</span>
              </button>
            ))}
          </div>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search users…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 w-56"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400 gap-3">
            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Loading users…
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-500 text-sm">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">No users found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Mocks</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(user => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={user.name} />
                      <div>
                        <div className="font-semibold text-slate-800 flex items-center gap-2">
                          {user.name}
                          {user.admin && (
                            <Badge color="bg-purple-100 text-purple-700">Admin</Badge>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">{user.email ?? "—"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell">
                    <span className="text-slate-600">{user.roleName ?? <span className="text-slate-300">—</span>}</span>
                  </td>
                  <td className="px-4 py-4 hidden lg:table-cell text-slate-600">
                    {user.mockCount}
                  </td>
                  <td className="px-4 py-4">
                    <Badge color={user.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}>
                      {user.active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {!user.admin && (
                        <button
                          onClick={() => handlePromote(user)}
                          disabled={busy === user.id}
                          title="Promote to admin"
                          className="text-xs px-3 py-1.5 rounded-lg border border-purple-200 text-purple-600 hover:bg-purple-50 disabled:opacity-50 font-medium transition-all"
                        >
                          {busy === user.id ? "…" : "Promote"}
                        </button>
                      )}
                      <button
                        onClick={() => handleToggleActive(user)}
                        disabled={busy === user.id}
                        title={user.active ? "Deactivate" : "Activate"}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all disabled:opacity-50 ${
                          user.active
                            ? "border-amber-200 text-amber-600 hover:bg-amber-50"
                            : "border-green-200 text-green-600 hover:bg-green-50"
                        }`}
                      >
                        {busy === user.id ? "…" : user.active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        disabled={busy === user.id || user.admin}
                        title={user.admin ? "Cannot delete admin" : "Delete user"}
                        className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed font-medium transition-all"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && !error && (
          <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400">
            Showing {filtered.length} of {users.length} users
          </div>
        )}
      </div>
    </div>
  );
}
