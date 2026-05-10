import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import UserAnalyticsPanel from "../components/UserAnalyticsPanel";

// ── Shared ────────────────────────────────────────────────────────────────────

function StatCard({ iconBg, icon, label, value, sub }: {
  iconBg: string; icon: React.ReactNode; label: string; value: string | number; sub: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-start gap-4">
      <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${iconBg}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5 leading-tight">{value}</p>
        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

function scoreChip(score: number) {
  const b = "inline-block text-xs font-bold px-2 py-0.5 rounded-full tabular-nums";
  if (score >= 8) return `${b} bg-green-100 text-green-700`;
  if (score >= 6) return `${b} bg-blue-100 text-blue-700`;
  if (score >= 4) return `${b} bg-amber-100 text-amber-700`;
  return `${b} bg-red-100 text-red-600`;
}

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }
  catch { return "—"; }
}

function scoreColor(s: number) {
  if (s >= 8) return "#22c55e";
  if (s >= 6) return "#3b82f6";
  if (s >= 4) return "#f59e0b";
  return "#ef4444";
}

function MiniBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${(value / 10) * 100}%`, background: color }}/>
      </div>
      <span className="text-xs font-bold text-gray-600 w-8 text-right tabular-nums">{value.toFixed(1)}</span>
    </div>
  );
}

function levelBadge(level: string) {
  const map: Record<string, string> = {
    Strong:    "bg-green-50 text-green-700 border-green-200",
    Moderate:  "bg-blue-50 text-blue-700 border-blue-200",
    "Needs Work": "bg-red-50 text-red-600 border-red-200",
  };
  return `text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${map[level] ?? "bg-gray-50 text-gray-600 border-gray-200"}`;
}

// ── Admin dashboard ───────────────────────────────────────────────────────────

type AdminData = Awaited<ReturnType<typeof api.getAdminDashboard>>;

function AdminDashboard() {
  const navigate        = useNavigate();
  const [data,          setData]          = useState<AdminData | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    api.getAdminDashboard().then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = (data?.allUsers ?? []).filter(u =>
    !search ||
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    (u.roleName ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (u.accountName ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">System-wide interview statistics across all users</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard iconBg="bg-blue-100" label="Total Users" value={data?.totalUsers ?? 0} sub="Registered accounts"
          icon={<svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>}/>
        <StatCard iconBg="bg-green-100" label="Total Sessions" value={data?.totalSessions ?? 0} sub={`${data?.completedSessions ?? 0} completed`}
          icon={<svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}/>
        <StatCard iconBg="bg-amber-100" label="Avg Score" value={data && data.avgScore > 0 ? `${data.avgScore.toFixed(1)} / 10` : "—"} sub="Across completed sessions"
          icon={<svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>}/>
        <StatCard iconBg="bg-purple-100" label="Completion Rate"
          value={data && data.totalSessions > 0 ? `${Math.round((data.completedSessions / data.totalSessions) * 100)}%` : "—"} sub="Sessions finished"
          icon={<svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>}/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top 5 Performers */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Top Performers</h2>
            <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">Top 5</span>
          </div>
          {loading ? <div className="py-8 text-center text-sm text-gray-400">Loading…</div> :
            <ul className="divide-y divide-gray-100">
              {(data?.topPerformers ?? []).slice(0, 5).map((u, i) => (
                <li key={u.userId}
                  onClick={() => setSelectedUserId(u.userId)}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-indigo-50/40 cursor-pointer transition-colors group">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                    ${i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-gray-200 text-gray-600" : "bg-gray-100 text-gray-500"}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 group-hover:text-indigo-700 transition-colors truncate">{u.name}</p>
                    <p className="text-xs text-gray-400">{u.roleName ?? "—"} · {u.accountName ?? "—"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={scoreChip(u.avgScore)}>{u.avgScore.toFixed(1)}</span>
                    <p className="text-[10px] text-gray-400 mt-0.5">{u.totalSessions} session{u.totalSessions !== 1 ? "s" : ""}</p>
                  </div>
                </li>
              ))}
              {(data?.topPerformers ?? []).length === 0 &&
                <li className="py-8 text-center text-sm text-gray-400">No data yet.</li>}
            </ul>}
        </div>

        {/* Top 5 Recent Activity */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Recent Activity</h2>
            <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">Latest 5</span>
          </div>
          {loading ? <div className="py-8 text-center text-sm text-gray-400">Loading…</div> :
            <ul className="divide-y divide-gray-100">
              {(data?.recentActivity ?? []).slice(0, 5).map((a, i) => (
                <li key={i} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {a.userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{a.userName}</p>
                    <p className="text-xs text-gray-400">{a.accountName} · {fmt(a.completedAt)}</p>
                  </div>
                  <span className={scoreChip(a.score)}>{a.score.toFixed(1)}</span>
                </li>
              ))}
              {(data?.recentActivity ?? []).length === 0 &&
                <li className="py-8 text-center text-sm text-gray-400">No activity yet.</li>}
            </ul>}
        </div>
      </div>

      {/* Users table — click to open analytics */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 gap-3 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">All Users</h2>
            <p className="text-[10px] text-gray-400 mt-0.5">Click a row to open analytics panel</p>
          </div>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input type="text" placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 w-44"/>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500">
              <th className="text-left px-5 py-3 font-medium">User</th>
              <th className="text-left px-5 py-3 font-medium hidden md:table-cell">Role / Account</th>
              <th className="text-center px-4 py-3 font-medium">Sessions</th>
              <th className="text-center px-4 py-3 font-medium">Avg Score</th>
              <th className="text-center px-4 py-3 font-medium">Best Score</th>
              <th className="text-center px-4 py-3 font-medium hidden lg:table-cell">Last Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(u => (
              <tr key={u.userId} onClick={() => setSelectedUserId(u.userId)}
                className={`hover:bg-indigo-50/40 transition-colors cursor-pointer group
                  ${selectedUserId === u.userId ? "bg-indigo-50/60 border-l-2 border-indigo-500" : ""}`}>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 text-white text-sm font-bold flex items-center justify-center shrink-0">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm group-hover:text-indigo-700 transition-colors">{u.name}</p>
                      <p className="text-[10px] text-gray-400 group-hover:text-indigo-400">View analytics →</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 hidden md:table-cell">
                  <p className="text-xs font-medium text-gray-700">{u.roleName ?? "—"}</p>
                  <p className="text-xs text-gray-400">{u.accountName ?? "—"}</p>
                </td>
                <td className="px-4 py-3.5 text-center"><span className="text-lg font-bold text-gray-800">{u.totalSessions}</span></td>
                <td className="px-4 py-3.5 text-center">{u.avgScore > 0 ? <span className={scoreChip(u.avgScore)}>{u.avgScore.toFixed(1)}</span> : <span className="text-gray-300 text-xs">—</span>}</td>
                <td className="px-4 py-3.5 text-center">{u.bestScore > 0 ? <span className={scoreChip(u.bestScore)}>{u.bestScore.toFixed(1)}</span> : <span className="text-gray-300 text-xs">—</span>}</td>
                <td className="px-4 py-3.5 text-center hidden lg:table-cell text-xs text-gray-500">{fmt(u.lastActivity)}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-sm text-gray-400">No users found.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Analytics panel */}
      {selectedUserId && (
        <UserAnalyticsPanel
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </div>
  );
}

// ── User dashboard ────────────────────────────────────────────────────────────

type UserMetrics = Awaited<ReturnType<typeof api.getUserMetrics>>;

interface LastReport {
  overallScore: number; skillLevel: string;
  company: string; role: string;
  strengths: string[]; weaknesses: string[];
  avgClarity: number; avgDepth: number; avgQuality: number;
}

function UserDashboard() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { currentUser } = useAuth();
  const [m,          setM]          = useState<UserMetrics | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [tick,       setTick]       = useState(0);
  const [lastReport, setLastReport] = useState<LastReport | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.getUserMetrics().then(setM).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load, tick]);

  useEffect(() => {
    const state = location.state as any;
    if (state?.refreshMetrics) {
      if (state.lastReport) setLastReport(state.lastReport);
      setTick(t => t + 1);
      // Clear router state without re-render
      window.history.replaceState({ ...window.history.state, usr: {} }, "");
    }
  }, [location.state]);

  // Has data if ANY answers exist (regardless of whether sessions are "completed")
  const noData = !m || (m.totalInterviews === 0 && m.dbQuestionsCompleted === 0);

  const radarData = m ? [
    { subject: "Clarity",  value: m.avgClarity  },
    { subject: "Depth",    value: m.avgDepth    },
    { subject: "Quality",  value: m.avgQuality  },
  ] : [];

  return (
    <div className="min-h-full bg-gray-50/40">
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            {currentUser?.name ? `Welcome back, ${currentUser.name} 👋` : "Your interview performance"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} title="Refresh"
            className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
            <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </button>
          <button onClick={() => navigate("/interviews")}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors">
            New Interview
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center">
          <svg className="animate-spin w-8 h-8 text-indigo-400 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <p className="text-sm text-gray-400 mt-3">Loading your stats…</p>
        </div>
      ) : noData ? (
        /* ── Empty state ── */
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-20 text-center space-y-4">
          <div className="text-5xl">📊</div>
          <h2 className="text-lg font-semibold text-gray-800">No interview data yet</h2>
          <p className="text-sm text-gray-500">Complete a mock interview to see your performance metrics here.</p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button onClick={() => navigate("/interviews")}
              className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors">
              Previously Asked Questions
            </button>
            <button onClick={() => navigate("/tech-stack-interview")}
              className="px-5 py-2.5 border border-indigo-200 text-indigo-700 text-sm font-semibold rounded-xl hover:bg-indigo-50 transition-colors">
              Tech Stack Evaluation
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* ── Row 1: Overview stats ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard iconBg="bg-indigo-100" label="Total Interviews" value={m!.totalInterviews}
              sub={`${m!.dbQuestionsCompleted} DB questions answered`}
              icon={<svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>}/>
            <StatCard iconBg="bg-green-100" label="Avg Score"
              value={m!.overallAvgScore > 0 ? `${m!.overallAvgScore.toFixed(1)} / 10` : "—"}
              sub={`${m!.confidentAnswers} confident · ${m!.needsImprovement} needs work`}
              icon={<svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}/>
            <StatCard iconBg="bg-amber-100" label="Best Tech Stack" value={m!.bestTechStack}
              sub={m!.bestTechScore > 0 ? `Avg ${m!.bestTechScore.toFixed(1)} / 10` : "—"}
              icon={<svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>}/>
            <StatCard iconBg="bg-red-100" label="Weakest Area" value={m!.weakestArea}
              sub={m!.weakestScore > 0 ? `Avg ${m!.weakestScore.toFixed(1)} / 10` : "Focus here"}
              icon={<svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>}/>
          </div>

          {/* ── Last interview result (shown immediately after navigation) ── */}
          {lastReport && (
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white flex items-center gap-6 flex-wrap">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-indigo-200 font-semibold uppercase tracking-wide mb-1">
                  Latest Interview — {lastReport.company} · {lastReport.role}
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-extrabold">{lastReport.overallScore.toFixed(1)}</span>
                  <span className="text-xl text-indigo-200">/10</span>
                  <span className="ml-2 px-3 py-1 bg-white/20 rounded-full text-sm font-semibold">{lastReport.skillLevel}</span>
                </div>
                <div className="flex gap-4 mt-3">
                  {[["Clarity", lastReport.avgClarity], ["Depth", lastReport.avgDepth], ["Quality", lastReport.avgQuality]].map(([l, v]) => (
                    <div key={l as string} className="text-center">
                      <p className="text-lg font-bold">{(v as number).toFixed(1)}</p>
                      <p className="text-xs text-indigo-200">{l}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3 min-w-[200px]">
                {lastReport.strengths.length > 0 && (
                  <div>
                    <p className="text-xs text-indigo-200 font-semibold mb-1.5">✓ Strengths</p>
                    <div className="flex flex-wrap gap-1.5">
                      {lastReport.strengths.slice(0, 3).map(s => (
                        <span key={s} className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {lastReport.weaknesses.length > 0 && (
                  <div>
                    <p className="text-xs text-indigo-200 font-semibold mb-1.5">↗ Improve</p>
                    <div className="flex flex-wrap gap-1.5">
                      {lastReport.weaknesses.slice(0, 2).map(w => (
                        <span key={w} className="text-xs bg-white/10 px-2 py-0.5 rounded-full">{w}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button onClick={() => setLastReport(null)} className="text-indigo-300 hover:text-white transition-colors self-start">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          )}

          {/* ── Row 2: Clarity/Depth/Quality radar + Performance trend ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Radar — answer quality profile */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-1">Answer Quality Profile</h2>
              <p className="text-xs text-gray-400 mb-3">Avg across all evaluated answers</p>
              <ResponsiveContainer width="100%" height={170}>
                <RadarChart data={radarData} margin={{ top: 0, right: 20, bottom: 0, left: 20 }}>
                  <PolarGrid stroke="#f1f5f9"/>
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "#6b7280" }}/>
                  <PolarRadiusAxis domain={[0,10]} tick={false} axisLine={false}/>
                  <Radar dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} strokeWidth={2}/>
                </RadarChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {[["Clarity", m!.avgClarity], ["Depth", m!.avgDepth], ["Quality", m!.avgQuality]].map(([l, v]) => (
                  <div key={l as string} className="text-center bg-gray-50 rounded-xl py-2">
                    <p className="text-lg font-bold text-indigo-600">{(v as number).toFixed(1)}</p>
                    <p className="text-[10px] text-gray-400 font-medium">{l}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance trend chart */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Performance Trend</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{m!.scoreTrend.length} sessions tracked</p>
                </div>
              </div>
              {m!.scoreTrend.length >= 2 ? (
                <ResponsiveContainer width="100%" height={175}>
                  <LineChart data={m!.scoreTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false}/>
                    <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false}/>
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
                      formatter={(v: any) => [`${Number(v).toFixed(1)} / 10`, "Score"]}/>
                    <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2.5}
                      dot={{ r: 4, fill: "#6366f1", stroke: "#fff", strokeWidth: 2 }}
                      activeDot={{ r: 6 }}/>
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="py-12 text-center text-sm text-gray-400">
                  Need at least 2 completed interviews to show the trend.
                  <br/>
                  <button onClick={() => navigate("/interviews")} className="mt-2 text-indigo-600 font-semibold hover:text-indigo-800 text-xs">Start one now →</button>
                </div>
              )}
            </div>
          </div>

          {/* ── Row 3: Tech strengths + Account stats ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Tech stack performance */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Tech Stack Performance</h2>
              {m!.techStrengths.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Take a Tech Stack Evaluation to see results here.</p>
              ) : (
                <div className="space-y-4">
                  {m!.techStrengths.slice(0, 8).map(t => (
                    <div key={t.tech}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700">{t.tech}</span>
                          <span className={levelBadge(t.level)}>{t.level}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">{t.questionsAnswered}q</span>
                          <span className={scoreChip(t.avgScore)}>{t.avgScore.toFixed(1)}</span>
                        </div>
                      </div>
                      <MiniBar value={t.avgScore} color={scoreColor(t.avgScore)}/>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Account-level stats */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Account-Level Statistics</h2>
              {m!.accountStats.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Complete interviews to see account stats.</p>
              ) : (
                <div className="space-y-3">
                  {m!.accountStats.map(a => (
                    <div key={a.account} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 text-white text-sm font-bold flex items-center justify-center shrink-0">
                        {a.account.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{a.account}</p>
                        <p className="text-xs text-gray-400">{a.totalInterviews} interview{a.totalInterviews !== 1 ? "s" : ""}</p>
                      </div>
                      <div className="text-right">
                        <span className={scoreChip(a.avgScore)}>{a.avgScore.toFixed(1)}</span>
                        <p className={`text-[10px] font-semibold mt-0.5 ${a.level === "Strong" ? "text-green-600" : a.level === "Moderate" ? "text-blue-600" : "text-red-500"}`}>{a.level}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Row 4: Recent interviews + Strengths/Weaknesses ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Recent completed */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Recently Completed</h2>
                <button onClick={() => navigate("/interviews")} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                  New →
                </button>
              </div>
              {m!.recentInterviews.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-400">No completed interviews yet.</div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {m!.recentInterviews.map(r => (
                    <li key={r.sessionId} className="flex items-center gap-3 px-5 py-3.5">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: scoreColor(r.score) }}>
                        {r.score.toFixed(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{r.label}</p>
                        <p className="text-xs text-gray-400">{r.company} · {fmt(r.completedAt)}</p>
                      </div>
                      <div className="text-right shrink-0 space-y-1">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border block text-center
                          ${r.type === "TECH_STACK" ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-indigo-50 text-indigo-700 border-indigo-200"}`}>
                          {r.type === "TECH_STACK" ? "Tech Stack" : "DB Questions"}
                        </span>
                        {r.skillLevel && r.skillLevel !== "—" && (
                          <p className="text-[10px] text-gray-400 text-center">{r.skillLevel}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Strength / Weakness + CTA */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-xs">✓</span>
                  Strong Areas
                </h3>
                {m!.strongAreas.length === 0 ? (
                  <p className="text-xs text-gray-400">Score ≥7 in 2+ answers in a tech to appear here.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {m!.strongAreas.map(a => (
                      <span key={a} className="text-xs font-semibold bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded-full">{a}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center text-red-500 text-xs">↗</span>
                  Focus Areas
                </h3>
                {m!.weakAreas.length === 0 ? (
                  <p className="text-xs text-gray-400">Areas scoring &lt;5 with 2+ answers will appear here.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {m!.weakAreas.map(a => (
                      <span key={a} className="text-xs font-semibold bg-red-50 text-red-600 border border-red-200 px-3 py-1 rounded-full">{a}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-5 text-white">
                <p className="font-semibold text-sm">Keep improving 🚀</p>
                <p className="text-indigo-200 text-xs mt-1 mb-4">Every session moves the needle.</p>
                <div className="flex gap-2">
                  <button onClick={() => navigate("/interviews")}
                    className="flex-1 py-2 bg-white text-indigo-700 text-xs font-bold rounded-xl hover:bg-indigo-50 transition-colors">
                    DB Questions
                  </button>
                  <button onClick={() => navigate("/tech-stack-interview")}
                    className="flex-1 py-2 bg-white/20 text-white text-xs font-bold rounded-xl hover:bg-white/30 transition-colors">
                    Tech Stack
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { currentUser } = useAuth();
  if (!currentUser) return null;
  return currentUser.isAdmin ? <AdminDashboard /> : <UserDashboard />;
}
