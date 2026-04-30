import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { AccountDto } from "../types";

const inp = "w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition";
const btnPrimary = "bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors shadow-sm";

export default function AccountsRoles() {
  const { currentUser } = useAuth();
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = currentUser?.isAdmin ?? false;

  // Form state
  const [accountName, setAccountName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [roles, setRoles] = useState<string[]>([""]);
  const [submitting, setSubmitting] = useState(false);

  const refresh = () =>
    api.listAccounts()
      .then(setAccounts)
      .catch(() => setError("Failed to load accounts."))
      .finally(() => setLoading(false));

  useEffect(() => { refresh(); }, []);

  // ── Role input helpers ──────────────────────────────────────────────────────

  function addRole() {
    setRoles(prev => [...prev, ""]);
  }

  function updateRole(index: number, value: string) {
    setRoles(prev => prev.map((r, i) => (i === index ? value : r)));
  }

  function removeRole(index: number) {
    setRoles(prev => prev.filter((_, i) => i !== index));
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accountName.trim()) return;
    const validRoles = roles.map(r => r.trim()).filter(Boolean);
    setSubmitting(true);
    setError(null);
    try {
      await api.createAccountWithRoles({
        accountName: accountName.trim(),
        logoUrl: logoUrl.trim() || undefined,
        roles: validRoles,
      });
      setAccountName("");
      setLogoUrl("");
      setRoles([""]);
      await refresh();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to create account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDeleteAccount(id: string) {
    if (!confirm("Delete this account and all its roles?")) return;
    try {
      await api.deleteAccount(id);
      await refresh();
    } catch {
      setError("Failed to delete account.");
    }
  }

  async function onDeleteRole(id: string) {
    if (!confirm("Delete this role?")) return;
    try {
      await api.deleteRole(id);
      await refresh();
    } catch {
      setError("Failed to delete role.");
    }
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Accounts &amp; Roles</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          {isAdmin ? "Create accounts with their associated roles." : "Browse available accounts and roles."}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-5">
          {error}
        </div>
      )}

      {/* ── Admin creation form ──────────────────────────────────────────── */}
      {isAdmin && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-card p-6 mb-8">
          <h3 className="text-sm font-bold text-slate-800 mb-5">Add New Account</h3>
          <form onSubmit={onSubmit} className="space-y-5">

            {/* Account name */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Account Name <span className="text-red-500">*</span>
              </label>
              <input
                className={inp}
                placeholder="e.g. PayPal, Ford, Google"
                value={accountName}
                onChange={e => setAccountName(e.target.value)}
                required
              />
            </div>

            {/* Logo URL */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Logo URL <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                className={inp}
                placeholder="https://logo.clearbit.com/paypal.com"
                value={logoUrl}
                onChange={e => setLogoUrl(e.target.value)}
              />
              {logoUrl.trim() && (
                <div className="mt-2 flex items-center gap-2">
                  <img
                    src={logoUrl.trim()}
                    alt="preview"
                    className="h-8 w-auto object-contain border border-slate-200 rounded p-1 bg-white"
                    onError={e => (e.currentTarget.style.display = "none")}
                  />
                  <span className="text-xs text-slate-400">Logo preview</span>
                </div>
              )}
            </div>

            {/* Roles */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">
                Roles for this account
              </label>
              <div className="space-y-2">
                {roles.map((role, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      className={inp}
                      placeholder={`Role ${index + 1}, e.g. Data Engineer`}
                      value={role}
                      onChange={e => updateRole(index, e.target.value)}
                    />
                    {roles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRole(index)}
                        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 transition-colors"
                        title="Remove role"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addRole}
                className="mt-2 flex items-center gap-1.5 text-xs font-medium text-purple-600 hover:text-purple-700 transition-colors"
              >
                <span className="text-base leading-none">+</span> Add another role
              </button>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={submitting || !accountName.trim()}
                className={`${btnPrimary} disabled:opacity-40 w-full`}
              >
                {submitting ? "Creating…" : "Create Account with Roles"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Accounts list ────────────────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 mb-3">
          All Accounts{" "}
          <span className="text-slate-400 font-normal">({accounts.length})</span>
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
                      <img
                        src={account.logoUrl}
                        alt={account.name}
                        className="h-8 w-auto max-w-[64px] object-contain"
                        onError={e => (e.currentTarget.style.display = "none")}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-sm font-bold">
                        {account.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm font-bold text-slate-900">{account.name}</span>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => onDeleteAccount(account.id)}
                      className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors"
                    >
                      Delete account
                    </button>
                  )}
                </div>

                {/* Roles */}
                <div className="px-5 py-3">
                  {account.roles.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No roles defined for this account.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {account.roles.map(role => (
                        <span
                          key={role.id}
                          className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-medium px-3 py-1 rounded-full"
                        >
                          {role.name}
                          {isAdmin && (
                            <button
                              onClick={() => onDeleteRole(role.id)}
                              className="text-purple-400 hover:text-red-500 font-bold transition-colors leading-none"
                              title="Delete role"
                            >
                              ×
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
