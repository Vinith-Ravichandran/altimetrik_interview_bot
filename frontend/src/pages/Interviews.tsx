import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { AccountDto, InterviewSessionDto, RoleDto } from "../types";

// ─── Logo helper ──────────────────────────────────────────────────────────────

const CLEARBIT: Record<string, string> = {
  ford: "ford.com", fordpro: "ford.com", "ford360": "ford.com",
  "ford a": "ford.com", "ford b": "ford.com", "ford c": "ford.com",
  msxi: "msxi.com", paypal: "paypal.com", amazon: "amazon.com",
  microsoft: "microsoft.com", google: "google.com", apple: "apple.com",
  meta: "meta.com", netflix: "netflix.com", uber: "uber.com",
  airbnb: "airbnb.com", linkedin: "linkedin.com", salesforce: "salesforce.com",
  ibm: "ibm.com", oracle: "oracle.com", altimetrik: "altimetrik.com",
  accenture: "accenture.com", infosys: "infosys.com", tcs: "tcs.com", wipro: "wipro.com",
  spotify: "spotify.com", twitter: "twitter.com", slack: "slack.com",
  adobe: "adobe.com", intel: "intel.com", cisco: "cisco.com",
};

const AVATAR_COLORS = [
  "bg-blue-500","bg-purple-500","bg-green-500","bg-amber-500",
  "bg-red-500","bg-indigo-500","bg-teal-500","bg-pink-500",
];
function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function CompanyLogo({ account }: { account: AccountDto }) {
  const [failed, setFailed] = useState(false);

  // Use the logoUrl stored in the backend first
  if (account.logoUrl && !failed) {
    return (
      <img
        src={account.logoUrl}
        alt={account.name}
        onError={() => setFailed(true)}
        className="h-10 w-auto max-w-[80px] object-contain"
      />
    );
  }

  // Fall back to Clearbit by name
  const domain = CLEARBIT[account.name.toLowerCase()];
  if (domain && !failed) {
    return (
      <img
        src={`https://logo.clearbit.com/${domain}`}
        alt={account.name}
        onError={() => setFailed(true)}
        className="h-10 w-auto max-w-[80px] object-contain"
      />
    );
  }

  // Letter avatar
  return (
    <div className={`w-12 h-12 rounded-full ${avatarColor(account.name)} flex items-center justify-center text-white text-xl font-bold`}>
      {account.name.charAt(0).toUpperCase()}
    </div>
  );
}

// ─── Small components ─────────────────────────────────────────────────────────

function CheckBadge() {
  return (
    <div className="absolute top-2 right-2 w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center shadow-sm">
      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
  );
}

function SectionTitle({ icon, number, title }: { icon: string; number: number; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-lg">{icon}</span>
      <h3 className="text-xs font-bold text-purple-700 tracking-widest uppercase">
        {number}. {title}
      </h3>
    </div>
  );
}

// ─── Experience levels (fixed) ────────────────────────────────────────────────

const EXPERIENCE = [
  { label: "Junior",    sub: "0-2 yrs", icon: "🌱" },
  { label: "Mid-Level", sub: "2-5 yrs", icon: "⭐" },
  { label: "Senior",    sub: "5+ yrs",  icon: "🚀" },
];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Interviews() {
  const [accounts, setAccounts]   = useState<AccountDto[]>([]);
  const [sessions, setSessions]   = useState<InterviewSessionDto[]>([]);

  // Roles are fetched dynamically when an account is selected
  const [accountRoles, setAccountRoles] = useState<RoleDto[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  const [selectedAccount, setSelectedAccount] = useState<AccountDto | null>(null);
  const [selectedRole, setSelectedRole]       = useState<RoleDto | null>(null);
  const [selectedExp, setSelectedExp]         = useState("");

  const [busy, setBusy]             = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.listAccounts().then(setAccounts).catch(() => {});
    api.listInterviews().then(setSessions).catch(() => {});
  }, []);

  // ── When account selected → fetch its roles ──────────────────────────────
  async function handleSelectAccount(account: AccountDto) {
    setSelectedAccount(account);
    setSelectedRole(null); // reset role when account changes

    // Prefer roles embedded in the AccountDto (already fetched)
    if (account.roles && account.roles.length > 0) {
      setAccountRoles(account.roles);
      return;
    }

    // Fallback: fetch from server with accountId filter
    setRolesLoading(true);
    try {
      const roles = await api.listRoles(account.id);
      setAccountRoles(roles);
    } catch {
      setAccountRoles([]);
    } finally {
      setRolesLoading(false);
    }
  }

  const canContinue = !!selectedAccount && !!selectedRole && !!selectedExp && !busy;

  async function onStart() {
    if (!canContinue || !selectedAccount || !selectedRole) return;
    setBusy(true);
    try {
      const session = await api.startInterview(selectedAccount.id, selectedRole.id);
      navigate(`/interviews/${session.id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-full bg-slate-50">

      {/* ── Gradient header ── */}
      <div className="bg-gradient-to-br from-violet-100 via-purple-50 to-indigo-50 border-b border-slate-200 py-10 px-6 text-center">
        <div className="text-5xl mb-3 drop-shadow">🤖</div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
          AI INTERVIEW BOT
        </h1>
        <p className="text-sm text-slate-500">
          Adaptive AI-powered interviews &nbsp;•&nbsp; Real-time evaluation &nbsp;•&nbsp; Personalized feedback
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">

        {/* ── Section 1: Account ── */}
        <section>
          <SectionTitle icon="💼" number={1} title="Choose Your Account" />
          {accounts.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 text-center shadow-card">
              <p className="text-sm text-slate-400">
                No accounts yet. Ask your admin to add accounts on the{" "}
                <Link to="/accounts-roles" className="text-purple-600 hover:underline font-medium">
                  Accounts &amp; Roles
                </Link>{" "}
                page.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {accounts.map(a => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => handleSelectAccount(a)}
                  className={`
                    relative flex flex-col items-center justify-center gap-3 p-5 rounded-xl border-2
                    transition-all duration-200 cursor-pointer w-36 h-32 bg-white
                    ${selectedAccount?.id === a.id
                      ? "border-purple-600 bg-purple-50 shadow-purple-glow"
                      : "border-slate-200 shadow-card hover:border-slate-300 hover:shadow-card-hover"
                    }
                  `}
                >
                  {selectedAccount?.id === a.id && <CheckBadge />}
                  <CompanyLogo account={a} />
                  <span className={`text-xs font-semibold text-center leading-tight ${selectedAccount?.id === a.id ? "text-purple-700" : "text-slate-700"}`}>
                    {a.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ── Section 2: Role (dynamic — shows roles for selected account) ── */}
        <section>
          <SectionTitle icon="💼" number={2} title="Choose Your Role" />
          {!selectedAccount ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-xl p-5 text-center">
              <p className="text-sm text-slate-400">Select an account above to see available roles.</p>
            </div>
          ) : rolesLoading ? (
            <p className="text-sm text-slate-400">Loading roles…</p>
          ) : accountRoles.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-5 text-center shadow-card">
              <p className="text-sm text-slate-400">
                No roles defined for <strong>{selectedAccount.name}</strong>. Ask your admin to add roles.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {accountRoles.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRole(r)}
                  className={`
                    relative flex items-center gap-2 px-5 py-2.5 rounded-lg border-2
                    text-sm font-medium transition-all duration-200 bg-white
                    ${selectedRole?.id === r.id
                      ? "border-purple-600 bg-purple-50 text-purple-700 shadow-purple-glow"
                      : "border-slate-200 text-slate-600 shadow-card hover:border-slate-300 hover:shadow-card-hover"
                    }
                  `}
                >
                  {selectedRole?.id === r.id && (
                    <svg className="w-3.5 h-3.5 text-purple-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {r.name}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ── Section 3: Experience ── */}
        <section>
          <SectionTitle icon="🚀" number={3} title="Choose Your Experience" />
          <div className="grid grid-cols-3 gap-4">
            {EXPERIENCE.map(({ label, sub, icon }) => (
              <button
                key={label}
                type="button"
                onClick={() => setSelectedExp(label)}
                className={`
                  relative flex items-center justify-center gap-3 py-5 px-4 rounded-xl border-2
                  bg-white transition-all duration-200
                  ${selectedExp === label
                    ? "border-purple-600 bg-purple-50 shadow-purple-glow"
                    : "border-slate-200 shadow-card hover:border-slate-300 hover:shadow-card-hover"
                  }
                `}
              >
                {selectedExp === label && <CheckBadge />}
                <span className="text-xl">{icon}</span>
                <div className="text-left">
                  <div className={`text-sm font-bold ${selectedExp === label ? "text-purple-700" : "text-slate-700"}`}>{label}</div>
                  <div className="text-xs text-slate-400">{sub}</div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ── Continue button ── */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={onStart}
            disabled={!canContinue}
            className={`
              w-full py-4 rounded-xl font-bold text-sm uppercase tracking-widest transition-all duration-200
              ${canContinue
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-200 hover:shadow-xl"
                : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
              }
            `}
          >
            {busy ? "Starting…" : "Continue to Mock Interview →"}
          </button>
          <p className="text-center text-xs text-slate-400">
            {canContinue
              ? `${selectedAccount!.name} · ${selectedRole!.name} · ${selectedExp}`
              : "Please select account, role, and experience to continue"}
          </p>
        </div>

        {/* ── Past sessions ── */}
        <div className="pb-8">
          <button
            type="button"
            onClick={() => setShowHistory(v => !v)}
            className="flex items-center gap-2 mx-auto text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="12" cy="12" r="9" strokeWidth={1.5} />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 7v5l3 3" />
            </svg>
            {showHistory ? "Hide Past Sessions" : "View Past Sessions"}
          </button>

          {showHistory && (
            <div className="mt-4 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-card">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700">Past Sessions</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium">Started</th>
                    <th className="text-left px-5 py-3 font-medium">Account</th>
                    <th className="text-left px-5 py-3 font-medium">Role</th>
                    <th className="text-center px-5 py-3 font-medium">Score</th>
                    <th className="text-left px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(s => (
                    <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 text-xs text-slate-500">{new Date(s.startedAt).toLocaleString()}</td>
                      <td className="px-5 py-3 text-xs font-semibold text-slate-800">{s.accountName}</td>
                      <td className="px-5 py-3 text-xs text-slate-600">{s.roleName}</td>
                      <td className="px-5 py-3 text-center">
                        {s.overallScore != null
                          ? <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-bold">{s.overallScore.toFixed(1)}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3">
                        {s.completedAt
                          ? <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">Done</span>
                          : <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-medium">In Progress</span>}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link to={`/interviews/${s.id}`} className="text-xs font-medium text-purple-600 hover:text-purple-700 transition-colors">
                          Open →
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {sessions.length === 0 && (
                    <tr><td className="px-5 py-8 text-center text-sm text-slate-400" colSpan={6}>No sessions yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
