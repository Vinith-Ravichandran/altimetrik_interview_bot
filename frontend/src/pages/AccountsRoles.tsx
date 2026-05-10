import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { AccountDto } from "../types";

const inp = "w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition";
const btnPrimary = "bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors shadow-sm";

// ── Inline edit panel for one account ────────────────────────────────────────

function EditAccountPanel({ account, onDone }: { account: AccountDto; onDone: () => void }) {
  const [name,      setName]      = useState(account.name);
  const [logoUrl,   setLogoUrl]   = useState(account.logoUrl ?? "");
  const [newRole,   setNewRole]   = useState("");
  const [saving,    setSaving]    = useState(false);
  const [addingRole, setAddingRole] = useState(false);
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState("");

  async function saveAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      await api.updateAccount(account.id, {
        name: name.trim(),
        logoUrl: logoUrl.trim() || undefined,
      });
      setSuccess("Account updated.");
      setTimeout(() => { setSuccess(""); onDone(); }, 800);
    } catch (err: any) {
      setError(err?.response?.data?.details ?? "Failed to update account.");
    } finally {
      setSaving(false);
    }
  }

  async function addRole(e: React.FormEvent) {
    e.preventDefault();
    if (!newRole.trim()) return;
    setAddingRole(true);
    setError("");
    try {
      await api.addRoleToAccount(account.id, newRole.trim());
      setNewRole("");
      setSuccess(`Role "${newRole.trim()}" added.`);
      setTimeout(() => { setSuccess(""); onDone(); }, 800);
    } catch (err: any) {
      setError(err?.response?.data?.details ?? "Failed to add role.");
    } finally {
      setAddingRole(false);
    }
  }

  return (
    <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-5 space-y-5">
      {error   && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      {success && <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{success}</p>}

      {/* Edit name + logo */}
      <form onSubmit={saveAccount} className="space-y-3">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Edit Account Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Account Name</label>
            <input className={inp} value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Logo URL <span className="text-slate-400">(optional)</span></label>
            <input className={inp} placeholder="https://…" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} />
          </div>
        </div>
        {logoUrl.trim() && (
          <img src={logoUrl.trim()} alt="preview"
            className="h-7 object-contain border border-slate-200 rounded p-1 bg-white"
            onError={e => (e.currentTarget.style.display = "none")} />
        )}
        <button type="submit" disabled={saving || !name.trim()}
          className={`${btnPrimary} disabled:opacity-40 text-xs px-5 py-2`}>
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </form>

      {/* Add role */}
      <form onSubmit={addRole} className="space-y-2">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Add New Role</p>
        <div className="flex gap-2">
          <input className={inp} placeholder="e.g. Data Engineer" value={newRole}
            onChange={e => setNewRole(e.target.value)} />
          <button type="submit" disabled={addingRole || !newRole.trim()}
            className={`${btnPrimary} disabled:opacity-40 text-xs px-4 shrink-0`}>
            {addingRole ? "Adding…" : "Add"}
          </button>
        </div>
      </form>

      <button onClick={onDone} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
        ✕ Cancel
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AccountsRoles() {
  const { currentUser } = useAuth();
  const [accounts,   setAccounts]   = useState<AccountDto[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [editingId,  setEditingId]  = useState<string | null>(null);
  const isAdmin = currentUser?.isAdmin ?? false;

  // Create form state
  const [accountName, setAccountName] = useState("");
  const [logoUrl,     setLogoUrl]     = useState("");
  const [roles,       setRoles]       = useState<string[]>([""]);
  const [submitting,  setSubmitting]  = useState(false);

  const refresh = () =>
    api.listAccounts()
      .then(setAccounts)
      .catch(() => setError("Failed to load accounts."))
      .finally(() => setLoading(false));

  useEffect(() => { refresh(); }, []);

  function addRoleField()                 { setRoles(prev => [...prev, ""]); }
  function updateRole(i: number, v: string) { setRoles(prev => prev.map((r, idx) => idx === i ? v : r)); }
  function removeRole(i: number)          { setRoles(prev => prev.filter((_, idx) => idx !== i)); }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accountName.trim()) return;
    const validRoles = roles.map(r => r.trim()).filter(Boolean);
    setSubmitting(true);
    setError(null);
    try {
      await api.createAccountWithRoles({ accountName: accountName.trim(), logoUrl: logoUrl.trim() || undefined, roles: validRoles });
      setAccountName(""); setLogoUrl(""); setRoles([""]);
      await refresh();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to create account.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDeleteAccount(id: string) {
    if (!confirm("Delete this account and all its roles?")) return;
    try { await api.deleteAccount(id); await refresh(); }
    catch { setError("Failed to delete account."); }
  }

  async function onDeleteRole(id: string) {
    if (!confirm("Delete this role?")) return;
    try { await api.deleteRole(id); await refresh(); }
    catch { setError("Failed to delete role."); }
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Accounts &amp; Roles</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          {isAdmin ? "Create and edit accounts with their associated roles." : "Browse available accounts and roles."}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-5">{error}</div>
      )}

      {/* Create form — admin only */}
      {isAdmin && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-card p-6 mb-8">
          <h3 className="text-sm font-bold text-slate-800 mb-5">Add New Account</h3>
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Account Name <span className="text-red-500">*</span>
                </label>
                <input className={inp} placeholder="e.g. PayPal, Ford, Google"
                  value={accountName} onChange={e => setAccountName(e.target.value)} required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Logo URL <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input className={inp} placeholder="https://logo.clearbit.com/paypal.com"
                  value={logoUrl} onChange={e => setLogoUrl(e.target.value)} />
                {logoUrl.trim() && (
                  <img src={logoUrl.trim()} alt="preview"
                    className="mt-2 h-8 object-contain border border-slate-200 rounded p-1 bg-white"
                    onError={e => (e.currentTarget.style.display = "none")} />
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">Roles</label>
              <div className="space-y-2">
                {roles.map((role, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input className={inp} placeholder={`Role ${index + 1}, e.g. Data Engineer`}
                      value={role} onChange={e => updateRole(index, e.target.value)} />
                    {roles.length > 1 && (
                      <button type="button" onClick={() => removeRole(index)}
                        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 transition-colors">
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={addRoleField}
                className="mt-2 flex items-center gap-1.5 text-xs font-medium text-purple-600 hover:text-purple-700 transition-colors">
                <span className="text-base leading-none">+</span> Add another role
              </button>
            </div>
            <button type="submit" disabled={submitting || !accountName.trim()}
              className={`${btnPrimary} disabled:opacity-40 w-full`}>
              {submitting ? "Creating…" : "Create Account with Roles"}
            </button>
          </form>
        </div>
      )}

      {/* Accounts list */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 mb-3">
          All Accounts <span className="text-slate-400 font-normal">({accounts.length})</span>
        </h3>

        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : accounts.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-xl p-10 text-center">
            <div className="text-3xl mb-2">🏢</div>
            <p className="text-sm text-slate-500">No accounts yet.</p>
            {isAdmin && <p className="text-xs text-slate-400 mt-1">Use the form above to add the first account.</p>}
          </div>
        ) : (
          <div className="space-y-4">
            {accounts.map(account => (
              <div key={account.id} className="bg-white border border-slate-200 rounded-xl shadow-card overflow-hidden">

                {/* Account header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    {account.logoUrl ? (
                      <img src={account.logoUrl} alt={account.name}
                        className="h-8 w-auto max-w-[64px] object-contain"
                        onError={e => (e.currentTarget.style.display = "none")} />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-sm font-bold">
                        {account.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm font-bold text-slate-900">{account.name}</span>
                    <span className="text-xs text-slate-400">{account.roles.length} role{account.roles.length !== 1 ? "s" : ""}</span>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setEditingId(editingId === account.id ? null : account.id)}
                        className={`text-xs font-medium transition-colors ${editingId === account.id ? "text-slate-500 hover:text-slate-700" : "text-blue-600 hover:text-blue-800"}`}
                      >
                        {editingId === account.id ? "Cancel" : "Edit"}
                      </button>
                      <button onClick={() => onDeleteAccount(account.id)}
                        className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors">
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                {/* Roles row */}
                <div className="px-5 py-3">
                  {account.roles.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No roles defined.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {account.roles.map(role => (
                        <span key={role.id}
                          className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-medium px-3 py-1 rounded-full">
                          {role.name}
                          {isAdmin && (
                            <button onClick={() => onDeleteRole(role.id)}
                              className="text-purple-400 hover:text-red-500 font-bold transition-colors leading-none"
                              title="Delete role">×</button>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Inline edit panel */}
                {isAdmin && editingId === account.id && (
                  <EditAccountPanel
                    account={account}
                    onDone={() => { setEditingId(null); refresh(); }}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
