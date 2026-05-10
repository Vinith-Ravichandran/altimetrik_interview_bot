import { useEffect, useState } from "react";
import { api } from "../api/client";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

type Analytics = Awaited<ReturnType<typeof api.getUserAnalytics>>;

interface Props {
  userId: string;
  onClose: () => void;
}

function scoreChip(s: number) {
  const b = "text-xs font-bold px-2 py-0.5 rounded-full tabular-nums";
  if (s >= 8) return `${b} bg-green-100 text-green-700`;
  if (s >= 6) return `${b} bg-blue-100 text-blue-700`;
  if (s >= 4) return `${b} bg-amber-100 text-amber-700`;
  return `${b} bg-red-100 text-red-600`;
}

function levelDot(level: string) {
  if (level === "Strong")    return "bg-green-500";
  if (level === "Moderate")  return "bg-blue-500";
  return "bg-red-400";
}

function levelBadge(level: string) {
  if (level === "Strong")    return "bg-green-50 text-green-700 border-green-200";
  if (level === "Moderate")  return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-red-50 text-red-600 border-red-200";
}

function fmt(iso: string) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }
  catch { return "—"; }
}

function MiniScore({ label, value }: { label: string; value: number }) {
  const color = value >= 8 ? "#22c55e" : value >= 6 ? "#3b82f6" : value >= 4 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex-1 text-center">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <div className="w-10 h-10 rounded-full border-2 flex items-center justify-center mx-auto mb-1"
        style={{ borderColor: color }}>
        <span className="text-xs font-bold" style={{ color }}>{value.toFixed(1)}</span>
      </div>
    </div>
  );
}

export default function UserAnalyticsPanel({ userId, onClose }: Props) {
  const [data,    setData]    = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState<"overview" | "tech" | "sessions">("overview");

  useEffect(() => {
    setLoading(true);
    setData(null);
    api.getUserAnalytics(userId)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <>
      {/* Invisible backdrop — captures outside clicks, no overlay, no blur */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Sliding panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-[520px] bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col overflow-hidden"
        style={{ animation: "slideIn 0.25s ease-out" }}
      >
        <style>{`
          @keyframes slideIn {
            from { transform: translateX(100%); }
            to   { transform: translateX(0); }
          }
        `}</style>

        {/* Panel header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white shrink-0">
          <div className="flex items-center gap-3">
            {data && (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                {data.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-sm font-bold text-gray-900">{data?.name ?? "Loading…"}</h2>
              {data && <p className="text-xs text-gray-400">{data.email ?? "—"}</p>}
            </div>
          </div>
          <button onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Loading analytics…
            </div>
          </div>
        ) : !data ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">No data available.</div>
        ) : (
          <>
            {/* Profile + score strip */}
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                  {data.roleName && <span className="bg-white border border-gray-200 rounded-full px-2.5 py-0.5 font-medium">{data.roleName}</span>}
                  {data.accountName && <span className="bg-white border border-gray-200 rounded-full px-2.5 py-0.5 font-medium">{data.accountName}</span>}
                  <span className={`border rounded-full px-2.5 py-0.5 font-medium ${data.active ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                    {data.active ? "Active" : "Inactive"}
                  </span>
                  <span className="text-gray-400">Member since {data.memberSince}</span>
                </div>
              </div>
              {/* Score strip */}
              <div className="grid grid-cols-4 gap-3 mt-4">
                {[
                  { l: "Interviews", v: data.totalSessions,    isNum: true  },
                  { l: "Avg Score",  v: data.overallAvgScore,  isNum: false },
                  { l: "Confident",  v: data.confidentAnswers, isNum: true  },
                  { l: "Needs Work", v: data.needsImprovement, isNum: true  },
                ].map(({ l, v, isNum }) => (
                  <div key={l} className="bg-white rounded-xl p-3 text-center shadow-sm border border-white/60">
                    <p className="text-lg font-bold text-gray-900">{isNum ? v : (v as number).toFixed(1)}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{l}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-6 py-3 border-b border-gray-100 shrink-0">
              {(["overview", "tech", "sessions"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize ${
                    tab === t ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}>
                  {t === "overview" ? "Overview"
                    : t === "tech" ? "Tech Stack"
                    : `Sessions${data ? ` (${data.recentSessions.length})` : ""}`}
                </button>
              ))}
            </div>

            {/* Tab content — scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* ── OVERVIEW tab ── */}
              {tab === "overview" && (
                <>
                  {/* Clarity / Depth / Quality */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Score Dimensions</p>
                    <div className="flex gap-2">
                      <MiniScore label="Clarity"  value={data.avgClarity} />
                      <MiniScore label="Depth"    value={data.avgDepth} />
                      <MiniScore label="Quality"  value={data.avgQuality} />
                      <MiniScore label="Overall"  value={data.overallAvgScore} />
                    </div>
                    <div className="mt-4 space-y-2.5">
                      {[
                        { l: "Clarity",  v: data.avgClarity  },
                        { l: "Depth",    v: data.avgDepth    },
                        { l: "Quality",  v: data.avgQuality  },
                        { l: "Overall",  v: data.overallAvgScore },
                      ].map(({ l, v }) => {
                        const color = v >= 8 ? "#22c55e" : v >= 6 ? "#3b82f6" : v >= 4 ? "#f59e0b" : "#ef4444";
                        return (
                          <div key={l} className="flex items-center gap-3">
                            <span className="text-xs text-gray-600 w-14">{l}</span>
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${(v / 10) * 100}%`, background: color }}/>
                            </div>
                            <span className="text-xs font-bold text-gray-700 w-8 text-right">{v.toFixed(1)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Performance trend */}
                  {data.scoreTrend.length > 1 && (
                    <div className="bg-white rounded-2xl border border-gray-200 p-5">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Score Trend</p>
                      <ResponsiveContainer width="100%" height={140}>
                        <LineChart data={data.scoreTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false}/>
                          <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false}/>
                          <Tooltip formatter={(v: number) => [`${v.toFixed(1)}/10`, "Score"]}
                            contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}/>
                          <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2}
                            dot={{ r: 3, fill: "#6366f1" }} activeDot={{ r: 5 }}/>
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Strong / Weak areas */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-50 rounded-2xl border border-green-200 p-4">
                      <p className="text-xs font-semibold text-green-700 mb-3">✓ Strong Areas</p>
                      {data.strongAreas.length === 0
                        ? <p className="text-xs text-gray-400">Not enough data</p>
                        : data.strongAreas.map(a => (
                          <div key={a} className="flex items-center gap-2 mb-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"/>
                            <span className="text-xs text-gray-700">{a}</span>
                          </div>
                        ))}
                    </div>
                    <div className="bg-red-50 rounded-2xl border border-red-200 p-4">
                      <p className="text-xs font-semibold text-red-600 mb-3">↗ Needs Work</p>
                      {data.weakAreas.length === 0
                        ? <p className="text-xs text-gray-400">No weak areas</p>
                        : data.weakAreas.map(a => (
                          <div key={a} className="flex items-center gap-2 mb-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0"/>
                            <span className="text-xs text-gray-700">{a}</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Account breakdown */}
                  {data.accountBreakdown.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-200 p-5">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Account Performance</p>
                      <div className="space-y-3">
                        {data.accountBreakdown.map(a => (
                          <div key={a.account} className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                              {a.account.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-gray-700 truncate">{a.account}</span>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[10px] text-gray-400">{a.count} session{a.count !== 1 ? "s" : ""}</span>
                                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${levelBadge(a.level)}`}>{a.level}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${levelDot(a.level)}`} style={{ width: `${(a.avgScore / 10) * 100}%` }}/>
                                </div>
                                <span className="text-xs font-bold text-gray-700 w-8 text-right">{a.avgScore.toFixed(1)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── TECH STACK tab ── */}
              {tab === "tech" && (
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tech Stack Breakdown</p>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"/> Strong</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"/> Moderate</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400"/> Needs Work</span>
                    </div>
                  </div>

                  {data.techBreakdown.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">No tech data yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {data.techBreakdown.map(t => (
                        <div key={t.tech}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${levelDot(t.level)}`}/>
                              <span className="text-sm font-medium text-gray-800">{t.tech}</span>
                              <span className="text-[10px] text-gray-400">{t.count} answer{t.count !== 1 ? "s" : ""}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${levelBadge(t.level)}`}>{t.level}</span>
                              <span className={scoreChip(t.avgScore)}>{t.avgScore.toFixed(1)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-500 ${levelDot(t.level)}`}
                                style={{ width: `${(t.avgScore / 10) * 100}%` }}/>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {(data.bestTech !== "—" || data.weakestTech !== "—") && (
                    <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-gray-100">
                      <div className="bg-green-50 rounded-xl p-3">
                        <p className="text-[10px] text-green-600 font-semibold mb-1">Best Tech</p>
                        <p className="text-sm font-bold text-gray-800">{data.bestTech}</p>
                        {data.bestTechScore > 0 && <p className="text-xs text-green-600">{data.bestTechScore.toFixed(1)}/10</p>}
                      </div>
                      <div className="bg-red-50 rounded-xl p-3">
                        <p className="text-[10px] text-red-500 font-semibold mb-1">Needs Most Work</p>
                        <p className="text-sm font-bold text-gray-800">{data.weakestTech}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── SESSIONS tab ── */}
              {tab === "sessions" && (
                <div className="space-y-4">
                  {data.recentSessions.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-sm text-gray-400">
                      No completed sessions yet.
                    </div>
                  ) : data.recentSessions.map((s, i) => (
                    <div key={s.sessionId}
                      className="bg-white rounded-xl border border-gray-200 flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 transition-colors">

                      {/* Index */}
                      <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>

                      {/* Label + meta */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                            s.mode === "TECH_STACK"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : "bg-indigo-50 text-indigo-700 border-indigo-200"}`}>
                            {s.mode === "TECH_STACK" ? "Tech Stack" : "DB Qs"}
                          </span>
                          <p className="text-sm font-semibold text-gray-800 truncate">{s.label}</p>
                          {s.company !== "General" && (
                            <span className="text-[10px] text-gray-400">· {s.company}</span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400">{fmt(s.completedAt)}</p>
                      </div>

                      {/* Questions taken */}
                      <div className="text-center shrink-0">
                        <p className="text-lg font-bold text-gray-800 leading-tight">{s.totalQuestions}</p>
                        <p className="text-[9px] text-gray-400 leading-tight">questions</p>
                      </div>

                      {/* Score */}
                      <div className="text-center shrink-0">
                        <span className={scoreChip(s.score)}>{s.score.toFixed(1)}/10</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </>
        )}
      </div>
    </>
  );
}
