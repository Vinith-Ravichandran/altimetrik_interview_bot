import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceDot,
} from "recharts";
import { useAuth, DemoUser, RealInterviewEntry } from "../context/AuthContext";
import { api } from "../api/client";
import type { AccountDto, InterviewSessionDto } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 10); }

function calcAvg(scores: number[]): number {
  if (!scores?.length) return 0;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function toPercent(score: number): number {
  return Math.round((score / 10) * 100 * 10) / 10;
}

function experienceLevel(mockCount: number): string {
  if (mockCount <= 5) return "Junior";
  if (mockCount <= 15) return "Mid-Level";
  return "Senior";
}

function experienceRange(level: string): string {
  if (level === "Junior") return "0-2 yrs";
  if (level === "Mid-Level") return "2-5 yrs";
  return "5+ yrs";
}

// ─── Skills derivation ────────────────────────────────────────────────────────

const ROLE_SKILLS: Record<string, string[]> = {
  "data engineer":       ["SQL", "ETL", "Data Modeling", "Python", "Spark",      "System Design", "Optimization", "Cloud", "Kafka"],
  "software engineer":   ["Algorithms", "DSA", "OOP", "Testing",   "Java",        "System Design", "Microservices", "Cloud", "Performance"],
  "backend developer":   ["Java", "Spring Boot", "REST APIs", "SQL", "Caching",   "Microservices", "Cloud", "Security", "System Design"],
  "frontend developer":  ["React", "JavaScript", "TypeScript", "CSS", "Testing",  "Performance", "Accessibility", "UX", "State Mgmt"],
  "java developer":      ["Java", "Spring", "OOP", "Multithreading", "SQL",       "Microservices", "Cloud", "Design Patterns"],
  "python developer":    ["Python", "Django", "REST APIs", "OOP", "Testing",      "Machine Learning", "DevOps", "Performance"],
  "qa engineer":         ["Manual Testing", "SQL", "API Testing", "Automation",   "Performance Testing", "Security", "JIRA"],
  "devops engineer":     ["CI/CD", "Docker", "Linux", "AWS", "Git",               "Kubernetes", "Security", "Monitoring"],
  "data scientist":      ["Python", "ML Basics", "Statistics", "Pandas",          "Deep Learning", "Big Data", "Visualization"],
  "product manager":     ["Communication", "Strategy", "Roadmap", "Agile",        "Technical Depth", "Analytics", "Stakeholder Mgmt"],
};

function deriveSkills(role: string, avgScore: number) {
  const key = role.toLowerCase();
  const skills = ROLE_SKILLS[key] ?? ["Problem Solving", "Communication", "Technical Knowledge", "Collaboration", "Code Quality", "Documentation", "Testing", "Architecture"];
  const splitAt = avgScore >= 7.5 ? 4 : avgScore >= 5 ? 3 : 2;
  return {
    strengths:   skills.slice(0, Math.min(splitAt, 3)),
    weaknesses:  skills.slice(splitAt, splitAt + 2),
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SCORE_BANDS = [
  { name: "90-100%", min: 9,   max: 10, color: "#22c55e" },
  { name: "75-89%",  min: 7.5, max: 9,  color: "#3b82f6" },
  { name: "50-74%",  min: 5,   max: 7.5,color: "#f59e0b" },
  { name: "Below 50%",min: 0,  max: 5,  color: "#ef4444" },
];

const CLEARBIT: Record<string, string> = {
  ford: "ford.com", fordpro: "ford.com", paypal: "paypal.com",
  amazon: "amazon.com", microsoft: "microsoft.com", google: "google.com",
  apple: "apple.com", meta: "meta.com", netflix: "netflix.com",
  msxi: "msxi.com", altimetrik: "altimetrik.com", uber: "uber.com",
  linkedin: "linkedin.com", salesforce: "salesforce.com",
};

function accountLogoUrl(name: string, backendLogoUrl?: string | null): string | null {
  if (backendLogoUrl) return backendLogoUrl;
  return CLEARBIT[name.toLowerCase()] ? `https://logo.clearbit.com/${CLEARBIT[name.toLowerCase()]}` : null;
}

const AVATAR_COLORS = ["bg-purple-500","bg-blue-500","bg-green-500","bg-amber-500","bg-red-500","bg-indigo-500","bg-teal-500","bg-pink-500"];
function avatarBg(name: string) { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]; }

// ─── Sub-components ───────────────────────────────────────────────────────────

function StarRating({ avgScore10 }: { avgScore10: number }) {
  const stars = Math.round((avgScore10 / 10) * 5);
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <svg key={i} className={`w-4 h-4 ${i <= stars ? "text-amber-400" : "text-slate-200"}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function KPICard({ icon, color, title, value, sub }: {
  icon: React.ReactNode; color: string; title: string; value: string; sub?: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-card p-5 flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center text-white text-xl shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-medium text-slate-500 mb-0.5">{title}</div>
        <div className="text-2xl font-bold text-slate-900 leading-tight">{value}</div>
        {sub && <div className="text-xs text-green-600 mt-0.5 font-medium">{sub}</div>}
      </div>
    </div>
  );
}

// ─── Charts ───────────────────────────────────────────────────────────────────

function ScoreDistributionChart({ data, totalUsers }: {
  data: { name: string; value: number; color: string }[];
  totalUsers: number;
}) {
  return (
    <div className="flex items-center gap-6">
      <div className="relative shrink-0">
        <PieChart width={200} height={200}>
          <Pie data={data} cx={95} cy={95} innerRadius={60} outerRadius={88} dataKey="value" paddingAngle={2}>
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
        </PieChart>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-2xl font-bold text-slate-900">{totalUsers}</div>
          <div className="text-xs text-slate-400">Users</div>
        </div>
      </div>
      <div className="space-y-2.5 text-sm">
        {data.map(d => (
          <div key={d.name} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: d.color }} />
              <span className="text-slate-600 text-xs">{d.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs">
                {totalUsers > 0 ? Math.round((d.value / totalUsers) * 100) : 0}% ({d.value})
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InterviewsOverTimeChart({ data }: { data: { date: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
          labelStyle={{ color: "#1e293b", fontWeight: 600 }}
        />
        <Area type="monotone" dataKey="count" stroke="#7c3aed" strokeWidth={2} fill="url(#purpleGrad)" dot={{ r: 3, fill: "#7c3aed" }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function TopRolesByScoreChart({ data }: { data: { role: string; score: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
        <YAxis dataKey="role" type="category" width={110} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(v) => [`${v}%`, "Avg Score"]}
          contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
        />
        <Bar dataKey="score" fill="#7c3aed" radius={[0, 4, 4, 0]} barSize={14}
          label={{ position: "right", fontSize: 11, fill: "#64748b", formatter: (v: unknown) => `${v}%` }} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── User Detail Drawer ───────────────────────────────────────────────────────

function UserDetailDrawer({ user, accountLogoSrc, onClose }: {
  user: DemoUser;
  accountLogoSrc: string | null;
  onClose: () => void;
}) {
  const avg = calcAvg(user.mockScores ?? []);
  const pct = toPercent(avg);
  const { strengths, weaknesses } = deriveSkills(user.role, avg);
  const exp = experienceLevel(user.mockCount);

  const scoreHistory = (user.mockScores ?? []).map((s, i) => ({
    session: `S${i + 1}`,
    score: toPercent(s),
  }));

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full max-w-lg bg-white shadow-2xl flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-br from-violet-50 to-purple-50 p-6 border-b border-slate-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-full ${avatarBg(user.name)} text-white text-xl font-bold flex items-center justify-center shrink-0`}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{user.name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">{user.role || "No role"}</span>
                  <span className="text-xs text-slate-500">{user.account || "—"}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <StarRating avgScore10={avg} />
                  <span className="text-sm font-bold text-slate-700">{pct > 0 ? `${pct}%` : "—"}</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Stat pills */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label: "Mock Sessions", value: user.mockCount },
              { label: "Real Interviews", value: user.realInterviews.length },
              { label: "Experience", value: exp },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white rounded-xl p-3 text-center border border-slate-200">
                <div className="text-lg font-bold text-slate-900">{value}</div>
                <div className="text-xs text-slate-500">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Score trend */}
          <div>
            <h4 className="text-sm font-bold text-slate-800 mb-3">Score History</h4>
            {scoreHistory.length > 0 ? (
              <div className="bg-slate-50 rounded-xl p-3">
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={scoreHistory} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="session" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v) => [`${v}%`, "Score"]} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                    <Bar dataKey="score" fill="#7c3aed" radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4 bg-slate-50 rounded-xl">No mock sessions yet.</p>
            )}
          </div>

          {/* Strengths */}
          <div>
            <h4 className="text-sm font-bold text-slate-800 mb-2">Strengths</h4>
            {strengths.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {strengths.map(s => (
                  <span key={s} className="bg-green-50 text-green-700 border border-green-200 text-xs font-medium px-3 py-1 rounded-full">{s}</span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No data yet.</p>
            )}
          </div>

          {/* Weaknesses */}
          <div>
            <h4 className="text-sm font-bold text-slate-800 mb-2">Areas to Improve</h4>
            {weaknesses.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {weaknesses.map(w => (
                  <span key={w} className="bg-red-50 text-red-700 border border-red-200 text-xs font-medium px-3 py-1 rounded-full">{w}</span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No data yet.</p>
            )}
          </div>

          {/* Real interview history */}
          <div>
            <h4 className="text-sm font-bold text-slate-800 mb-3">Real Interview History</h4>
            {user.realInterviews.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4 bg-slate-50 rounded-xl">No real interviews logged yet.</p>
            ) : (
              <div className="space-y-2">
                {[...user.realInterviews].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((r, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                    <div>
                      <div className="text-xs font-semibold text-slate-800">{r.account}</div>
                      <div className="text-xs text-slate-500">{r.panelist}</div>
                    </div>
                    <div className="text-xs text-slate-400">{new Date(r.date).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

function AdminDashboard() {
  const { users, setUsers, managedRoles } = useAuth();
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [sessions, setSessions] = useState<InterviewSessionDto[]>([]);
  const [selectedUser, setSelectedUser] = useState<DemoUser | null>(null);
  const [search, setSearch] = useState("");
  const [filterAccount, setFilterAccount] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [filterExp, setFilterExp] = useState("all");
  const [filterScore, setFilterScore] = useState("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  // Form state for adding users
  const [addName, setAddName] = useState("");
  const [addRole, setAddRole] = useState("");
  const [addAccount, setAddAccount] = useState("");
  const [addType, setAddType] = useState<"user" | "admin">("user");
  const { managedRoles: roles } = useAuth();

  useEffect(() => {
    api.listAccounts().then(setAccounts).catch(() => {});
    api.listInterviews().then(setSessions).catch(() => {});
  }, []);

  const nonAdminUsers = useMemo(() => users.filter(u => !u.isAdmin), [users]);

  // ── KPIs ──
  const kpis = useMemo(() => {
    const totalUsers = nonAdminUsers.length;
    const totalMocks = nonAdminUsers.reduce((s, u) => s + u.mockCount, 0);

    const usersWithScores = nonAdminUsers.filter(u => u.mockScores?.length > 0);
    const avgPct = usersWithScores.length > 0
      ? Math.round(usersWithScores.reduce((s, u) => s + toPercent(calcAvg(u.mockScores)), 0) / usersWithScores.length * 10) / 10
      : 0;

    // top role by avg score
    const roleMap: Record<string, number[]> = {};
    for (const u of usersWithScores) {
      if (!u.role) continue;
      if (!roleMap[u.role]) roleMap[u.role] = [];
      roleMap[u.role].push(calcAvg(u.mockScores));
    }
    let topRole = "—";
    let topScore = 0;
    for (const [role, scores] of Object.entries(roleMap)) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (avg > topScore) { topScore = avg; topRole = role; }
    }

    return { totalUsers, totalMocks, avgPct, topRole, topScore: toPercent(topScore) };
  }, [nonAdminUsers]);

  // ── Score distribution ──
  const scoreDistribution = useMemo(() =>
    SCORE_BANDS.map(band => ({
      name: band.name,
      value: nonAdminUsers.filter(u => {
        const avg = calcAvg(u.mockScores ?? []);
        return avg >= band.min && avg < band.max;
      }).length,
      color: band.color,
    })),
  [nonAdminUsers]);

  // ── Interviews over time (sessions grouped by week) ──
  const interviewsOverTime = useMemo(() => {
    const weeks: Record<string, number> = {};
    const now = new Date();
    // last 6 weeks labels
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      weeks[label] = 0;
    }
    for (const s of sessions) {
      const d = new Date(s.startedAt);
      const daysDiff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 42) continue;
      const weekIdx = Math.floor(daysDiff / 7);
      const weekDate = new Date(now);
      weekDate.setDate(weekDate.getDate() - weekIdx * 7);
      const label = weekDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (weeks[label] !== undefined) weeks[label]++;
    }
    // Supplement with mock counts distributed across weeks if no sessions
    if (sessions.length === 0) {
      const labels = Object.keys(weeks);
      const totalMocks = kpis.totalMocks;
      if (totalMocks > 0) {
        labels.forEach((l, i) => { weeks[l] = Math.round(totalMocks * (0.1 + i * 0.05)); });
      }
    }
    return Object.entries(weeks).map(([date, count]) => ({ date, count }));
  }, [sessions, kpis.totalMocks]);

  // ── Top roles by avg score ──
  const topRoles = useMemo(() => {
    const roleMap: Record<string, number[]> = {};
    for (const u of nonAdminUsers) {
      if (!u.role || !u.mockScores?.length) continue;
      if (!roleMap[u.role]) roleMap[u.role] = [];
      roleMap[u.role].push(calcAvg(u.mockScores));
    }
    return Object.entries(roleMap)
      .map(([role, scores]) => ({
        role,
        score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10 * 10,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }, [nonAdminUsers]);

  // ── Unique filter options ──
  const uniqueAccounts = useMemo(() => [...new Set(nonAdminUsers.map(u => u.account).filter(Boolean))], [nonAdminUsers]);
  const uniqueRoles    = useMemo(() => [...new Set(nonAdminUsers.map(u => u.role).filter(Boolean))], [nonAdminUsers]);

  // ── Filtered + paginated users ──
  const filteredUsers = useMemo(() => {
    return nonAdminUsers.filter(u => {
      const avg = calcAvg(u.mockScores ?? []);
      const pct = toPercent(avg);
      const exp = experienceLevel(u.mockCount);
      if (search && !u.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterAccount !== "all" && u.account !== filterAccount) return false;
      if (filterRole    !== "all" && u.role    !== filterRole)    return false;
      if (filterExp     !== "all" && exp       !== filterExp)     return false;
      if (filterScore === "90+" && pct < 90) return false;
      if (filterScore === "75-89" && (pct < 75 || pct >= 90)) return false;
      if (filterScore === "50-74" && (pct < 50 || pct >= 75)) return false;
      if (filterScore === "below50" && pct >= 50) return false;
      return true;
    }).sort((a, b) => calcAvg(b.mockScores ?? []) - calcAvg(a.mockScores ?? []));
  }, [nonAdminUsers, search, filterAccount, filterRole, filterExp, filterScore]);

  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE);
  const pagedUsers = filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function resetFilters() {
    setSearch(""); setFilterAccount("all"); setFilterRole("all");
    setFilterExp("all"); setFilterScore("all"); setPage(1);
  }

  function onAddUser(e: React.FormEvent) {
    e.preventDefault();
    if (!addName.trim()) return;
    setUsers(prev => [...prev, {
      id: uid(), name: addName.trim(), role: addRole, account: addAccount,
      isAdmin: addType === "admin", mockCount: 0, mockScores: [], realInterviews: [],
      password: addType === "admin" ? "admin" : "password",
    }]);
    setAddName(""); setAddRole(""); setAddAccount(""); setAddType("user");
  }

  function deleteUser(id: string) {
    if (!confirm("Delete this user?")) return;
    setUsers(prev => prev.filter(u => u.id !== id));
  }

  const sel = "bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition";

  // Account logo lookup
  const accountLogo = (name: string) => {
    const backendAccount = accounts.find(a => a.name.toLowerCase() === name.toLowerCase());
    return accountLogoUrl(name, backendAccount?.logoUrl);
  };

  return (
    <div className="min-h-full bg-slate-50">
      {/* ── Page header ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Dashboard</h2>
            <p className="text-sm text-slate-500 mt-0.5">Overview of users and mock interview performance</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 w-64 transition"
                placeholder="Search users, roles, accounts…"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
            color="bg-purple-600" title="Total Users" value={kpis.totalUsers.toString()}
            sub={kpis.totalUsers > 0 ? "Active members" : undefined}
          />
          <KPICard
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
            color="bg-green-500" title="Total Mock Interviews" value={kpis.totalMocks.toLocaleString()}
            sub={kpis.totalMocks > 0 ? "Sessions completed" : undefined}
          />
          <KPICard
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>}
            color="bg-amber-400" title="Average Score" value={kpis.avgPct > 0 ? `${kpis.avgPct}%` : "—"}
            sub={kpis.avgPct > 0 ? "Across all sessions" : undefined}
          />
          <KPICard
            icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
            color="bg-blue-500" title="Top Performing Role" value={kpis.topRole}
            sub={kpis.topScore > 0 ? `Avg Score: ${kpis.topScore}%` : undefined}
          />
        </div>

        {/* ── Analytics row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Score distribution */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-card p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Average Score Distribution</h3>
            <ScoreDistributionChart data={scoreDistribution} totalUsers={nonAdminUsers.length} />
          </div>

          {/* Interviews over time */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800">Mock Interviews Over Time</h3>
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full">Last 6 weeks</span>
            </div>
            <InterviewsOverTimeChart data={interviewsOverTime} />
          </div>

          {/* Top roles */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-card p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Top Roles by Average Score</h3>
            {topRoles.length > 0
              ? <TopRolesByScoreChart data={topRoles} />
              : <p className="text-sm text-slate-400 text-center py-8">No score data yet.</p>
            }
          </div>
        </div>

        {/* ── Add User + Filters row ── */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-card p-5">
          <details>
            <summary className="text-sm font-bold text-slate-800 cursor-pointer select-none flex items-center gap-2">
              <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add New User
            </summary>
            <form onSubmit={onAddUser} className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-4 pt-4 border-t border-slate-100">
              <input className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Full name" value={addName} onChange={e => setAddName(e.target.value)} required />
              <select className={sel} value={addRole} onChange={e => setAddRole(e.target.value)}>
                <option value="">Select role…</option>
                {managedRoles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <select className={sel} value={addAccount} onChange={e => setAddAccount(e.target.value)}>
                <option value="">Select account…</option>
                {accounts.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
              </select>
              <select className={sel} value={addType} onChange={e => setAddType(e.target.value as "user"|"admin")}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
              <button className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors shadow-sm">Add User</button>
            </form>
            <p className="text-xs text-slate-400 mt-2">New user default password: <code className="bg-slate-100 px-1 rounded">password</code></p>
          </details>
        </div>

        {/* ── Filters bar ── */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-card p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Filter by Account</label>
              <select className={`${sel} text-xs min-w-[140px]`} value={filterAccount} onChange={e => { setFilterAccount(e.target.value); setPage(1); }}>
                <option value="all">All Accounts</option>
                {uniqueAccounts.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Filter by Role</label>
              <select className={`${sel} text-xs min-w-[140px]`} value={filterRole} onChange={e => { setFilterRole(e.target.value); setPage(1); }}>
                <option value="all">All Roles</option>
                {uniqueRoles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Filter by Experience</label>
              <select className={`${sel} text-xs min-w-[160px]`} value={filterExp} onChange={e => { setFilterExp(e.target.value); setPage(1); }}>
                <option value="all">All Experience Levels</option>
                <option value="Junior">Junior (0-5 sessions)</option>
                <option value="Mid-Level">Mid-Level (6-15 sessions)</option>
                <option value="Senior">Senior (16+ sessions)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Filter by Score</label>
              <select className={`${sel} text-xs min-w-[130px]`} value={filterScore} onChange={e => { setFilterScore(e.target.value); setPage(1); }}>
                <option value="all">All Scores</option>
                <option value="90+">90%+</option>
                <option value="75-89">75–89%</option>
                <option value="50-74">50–74%</option>
                <option value="below50">Below 50%</option>
              </select>
            </div>
            <div className="flex flex-col justify-end">
              <label className="text-xs font-medium text-slate-500 opacity-0">Reset</label>
              <button onClick={resetFilters} className="flex items-center gap-1.5 text-sm font-medium text-purple-600 hover:text-purple-700 px-3 py-2 rounded-lg hover:bg-purple-50 transition-colors border border-transparent hover:border-purple-200">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Reset Filters
              </button>
            </div>
          </div>
        </div>

        {/* ── User Performance Table ── */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">User Performance</h3>
            <p className="text-xs text-slate-400 mt-0.5">Detailed performance metrics of all users</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1000px]">
              <thead className="bg-slate-50 text-slate-500 text-xs">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">User</th>
                  <th className="text-left px-5 py-3 font-medium">Account</th>
                  <th className="text-left px-5 py-3 font-medium">Role</th>
                  <th className="text-left px-5 py-3 font-medium">Experience</th>
                  <th className="text-left px-5 py-3 font-medium">Mocks</th>
                  <th className="text-left px-5 py-3 font-medium">Avg Score</th>
                  <th className="text-left px-5 py-3 font-medium">Strengths</th>
                  <th className="text-left px-5 py-3 font-medium">Weaknesses</th>
                  <th className="text-left px-5 py-3 font-medium">Last Activity</th>
                  <th className="text-left px-5 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {pagedUsers.map(u => {
                  const avg = calcAvg(u.mockScores ?? []);
                  const pct = toPercent(avg);
                  const { strengths, weaknesses } = deriveSkills(u.role, avg);
                  const exp = experienceLevel(u.mockCount);
                  const lastDate = u.realInterviews.length > 0
                    ? new Date(Math.max(...u.realInterviews.map(r => new Date(r.date).getTime()))).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                    : "—";
                  const logoSrc = accountLogo(u.account ?? "");

                  return (
                    <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                      {/* User */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full ${avatarBg(u.name)} text-white text-sm font-bold flex items-center justify-center shrink-0`}>
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-slate-800">{u.name}</div>
                          </div>
                        </div>
                      </td>

                      {/* Account */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          {logoSrc ? (
                            <img src={logoSrc} alt={u.account} className="h-5 w-auto max-w-[40px] object-contain"
                              onError={e => (e.currentTarget.style.display = "none")} />
                          ) : null}
                          <span className="text-xs font-medium text-slate-700">{u.account || "—"}</span>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-5 py-3.5">
                        <span className="bg-purple-50 text-purple-700 border border-purple-200 text-xs font-medium px-2 py-0.5 rounded-full">
                          {u.role || "—"}
                        </span>
                      </td>

                      {/* Experience */}
                      <td className="px-5 py-3.5 text-xs text-slate-500">
                        {exp} <span className="text-slate-300">· {experienceRange(exp)}</span>
                      </td>

                      {/* Mocks */}
                      <td className="px-5 py-3.5 text-xs font-semibold text-slate-800">{u.mockCount}</td>

                      {/* Avg score */}
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <StarRating avgScore10={avg} />
                            <span className="text-xs font-bold text-slate-700">{pct > 0 ? `${pct}%` : "—"}</span>
                          </div>
                        </div>
                      </td>

                      {/* Strengths */}
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {strengths.map(s => (
                            <span key={s} className="bg-green-50 text-green-700 border border-green-200 text-xs px-1.5 py-0.5 rounded-full">{s}</span>
                          ))}
                          {strengths.length === 0 && <span className="text-slate-300 text-xs">—</span>}
                        </div>
                      </td>

                      {/* Weaknesses */}
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {weaknesses.map(w => (
                            <span key={w} className="bg-red-50 text-red-600 border border-red-200 text-xs px-1.5 py-0.5 rounded-full">{w}</span>
                          ))}
                          {weaknesses.length === 0 && <span className="text-slate-300 text-xs">—</span>}
                        </div>
                      </td>

                      {/* Last activity */}
                      <td className="px-5 py-3.5 text-xs text-slate-500">{lastDate}</td>

                      {/* Actions */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedUser(u)}
                            className="bg-white border border-slate-300 hover:border-purple-400 hover:text-purple-700 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                          >
                            View Details
                          </button>
                          <button
                            onClick={() => deleteUser(u.id)}
                            className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                            title="Delete user"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {pagedUsers.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-5 py-12 text-center">
                      <div className="text-2xl mb-2">🔍</div>
                      <p className="text-sm text-slate-500 font-medium">No users match your filters.</p>
                      <button onClick={resetFilters} className="text-xs text-purple-600 hover:underline mt-1">Reset filters</button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredUsers.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Showing {Math.min((page - 1) * PAGE_SIZE + 1, filteredUsers.length)} to {Math.min(page * PAGE_SIZE, filteredUsers.length)} of {filteredUsers.length} users
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-purple-400 hover:text-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs"
                >‹</button>

                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg border text-xs font-medium transition-all ${page === n ? "bg-purple-600 border-purple-600 text-white" : "border-slate-200 text-slate-500 hover:border-purple-400 hover:text-purple-700"}`}
                  >
                    {n}
                  </button>
                ))}

                {totalPages > 5 && <span className="text-slate-400 text-xs px-1">…</span>}
                {totalPages > 5 && (
                  <button onClick={() => setPage(totalPages)} className={`w-8 h-8 flex items-center justify-center rounded-lg border text-xs font-medium transition-all ${page === totalPages ? "bg-purple-600 border-purple-600 text-white" : "border-slate-200 text-slate-500 hover:border-purple-400"}`}>
                    {totalPages}
                  </button>
                )}

                <button
                  disabled={page === totalPages || totalPages === 0}
                  onClick={() => setPage(p => p + 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-purple-400 hover:text-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs"
                >›</button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ── User detail drawer ── */}
      {selectedUser && (
        <UserDetailDrawer
          user={selectedUser}
          accountLogoSrc={accountLogo(selectedUser.account ?? "")}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
}

// ─── User View (regular users) ────────────────────────────────────────────────

// ─── User dashboard helpers ───────────────────────────────────────────────────

const QUOTES = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "The future depends on what you do today.", author: "Mahatma Gandhi" },
  { text: "Practice is the best of all instructors.", author: "Publilius Syrus" },
];

const SKILL_COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#7c3aed", "#ef4444", "#22c55e", "#06b6d4"];

function buildSkills(role: string, avgScore: number, seed: number) {
  const key = role.toLowerCase();
  const skills = (ROLE_SKILLS[key] ?? ["Problem Solving", "Communication", "Technical Knowledge", "Collaboration", "Code Quality"]).slice(0, 5);
  return skills.map((name, i) => {
    const variation = ((name.charCodeAt(0) + seed + i) % 24) - 12;
    const pct = Math.min(98, Math.max(35, Math.round(toPercent(avgScore) + variation)));
    return { name, value: pct, color: SKILL_COLORS[i % SKILL_COLORS.length] };
  });
}

function buildPerformanceTrend(scores: number[]) {
  return scores.slice(-8).map((s, i, arr) => {
    const d = new Date();
    d.setDate(d.getDate() - (arr.length - 1 - i) * 7);
    return {
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      score: toPercent(s),
    };
  });
}

const SESSION_ICONS = ["🗄️", "🐍", "⚙️", "💻", "☕", "⚛️", "☁️", "🔍"];
const SESSION_NAMES = ["SQL Interview Mock", "Python Programming", "System Design Mock", "Data Structures", "Backend Concepts", "Frontend Basics", "Cloud Architecture", "Problem Solving"];

function buildRecentSessions(user: DemoUser) {
  return (user.mockScores ?? []).slice(-5).map((score, i, arr) => {
    const d = new Date();
    d.setDate(d.getDate() - (arr.length - 1 - i) * 7);
    const nameIdx = (user.name.charCodeAt(0) + i) % SESSION_NAMES.length;
    return {
      icon: SESSION_ICONS[nameIdx],
      title: SESSION_NAMES[nameIdx],
      role: user.role || "General",
      score: toPercent(score),
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    };
  }).reverse();
}

// ─── User Dashboard ───────────────────────────────────────────────────────────

function UserView({ user, accounts, managedRoles, updateUser }: {
  user: DemoUser; accounts: AccountDto[]; managedRoles: string[];
  updateUser: (id: string, patch: Partial<DemoUser>) => void;
}) {
  const navigate = useNavigate();
  const [sessionFilter, setSessionFilter] = useState(6);

  const avg = calcAvg(user.mockScores ?? []);
  const avgPct = toPercent(avg);
  const highestPct = user.mockScores?.length > 0 ? toPercent(Math.max(...user.mockScores)) : 0;
  const lowestPct  = user.mockScores?.length > 0 ? toPercent(Math.min(...user.mockScores)) : 0;
  const quote = QUOTES[user.name.charCodeAt(0) % QUOTES.length];
  const streak = Math.min(30, user.mockCount + user.realInterviews.length);
  const skills = buildSkills(user.role, avg, user.name.charCodeAt(0));
  const overallSkillAvg = skills.length > 0 ? Math.round(skills.reduce((s, x) => s + x.value, 0) / skills.length) : 0;
  const recentSessions = buildRecentSessions(user).slice(0, sessionFilter === 3 ? 3 : 5);
  const trendData = buildPerformanceTrend((user.mockScores ?? []).slice(-sessionFilter));
  const { strengths, weaknesses } = deriveSkills(user.role, avg);

  const strengthLabels = ["Strong", "Strong", "Good"];
  const weaknessLabels = ["Weak", "Needs Work", "Needs Work"];

  const prevAvg = user.mockScores?.length >= 2
    ? toPercent(calcAvg(user.mockScores.slice(0, -1)))
    : avgPct;
  const improvement = avgPct - prevAvg;

  const sel = "bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition";

  // Custom tooltip for performance chart
  const PerfTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs min-w-[120px]">
        <div className="text-purple-600 font-bold mb-1">{label}</div>
        <div className="text-slate-600">Score: <span className="font-bold text-slate-900">{payload[0]?.value}%</span></div>
      </div>
    );
  };

  return (
    <div className="min-h-full bg-slate-50">

      {/* ── User Header ── */}
      <div className="bg-white border-b border-slate-100 px-6 py-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Avatar + greeting */}
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-full ${avatarBg(user.name)} text-white text-xl font-bold flex items-center justify-center shrink-0`}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{user.name}</h2>
              <p className="text-sm text-slate-500 mt-0.5">Welcome back! Ready to prepare for your next interview?</p>
            </div>
          </div>

          {/* Right: Quote + Streak */}
          <div className="flex items-stretch gap-3 flex-wrap">
            {/* Motivation quote */}
            <div className="bg-purple-50 border border-purple-100 rounded-xl px-5 py-3 max-w-xs">
              <div className="flex items-start gap-2">
                <span className="text-purple-400 text-xl leading-none mt-0.5">"</span>
                <div>
                  <p className="text-xs font-medium text-slate-700 leading-relaxed">{quote.text}</p>
                  <p className="text-xs text-purple-600 font-semibold mt-1">— {quote.author}</p>
                </div>
              </div>
            </div>
            {/* Day streak */}
            <div className="bg-white border border-slate-200 rounded-xl px-5 py-3 flex items-center gap-3 shadow-card">
              <div className="text-3xl">🔥</div>
              <div>
                <div className="text-2xl font-extrabold text-slate-900 leading-tight">{streak}</div>
                <div className="text-xs font-semibold text-slate-500">Day Streak</div>
                <div className="text-xs text-orange-500 font-medium">Keep it up!</div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile selectors (role + account) — compact inline */}
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <span className="text-xs text-slate-400 font-medium">Your profile:</span>
          {managedRoles.length > 0 ? (
            <select className="text-xs bg-purple-50 border border-purple-200 text-purple-700 font-medium rounded-full px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-400"
              value={user.role} onChange={e => updateUser(user.id, { role: e.target.value })}>
              <option value="">Select role…</option>
              {managedRoles.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          ) : user.role ? (
            <span className="text-xs bg-purple-50 border border-purple-200 text-purple-700 font-medium rounded-full px-3 py-1.5">{user.role}</span>
          ) : null}
          {accounts.length > 0 ? (
            <select className="text-xs bg-slate-100 border border-slate-200 text-slate-600 font-medium rounded-full px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-400"
              value={user.account} onChange={e => updateUser(user.id, { account: e.target.value })}>
              <option value="">Select account…</option>
              {accounts.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
            </select>
          ) : user.account ? (
            <span className="text-xs bg-slate-100 border border-slate-200 text-slate-600 font-medium rounded-full px-3 py-1.5">{user.account}</span>
          ) : null}
        </div>
      </div>

      <div className="px-6 py-6 space-y-5">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Mock Sessions */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-card p-5">
            <div className="flex items-start justify-between">
              <div className="w-11 h-11 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xs text-slate-500 font-medium">Mock Sessions</div>
              <div className="text-3xl font-extrabold text-slate-900 mt-0.5">{user.mockCount}</div>
              <div className="text-xs text-slate-400 mt-0.5">Total Attempted</div>
              {user.mockCount > 0 && <div className="text-xs text-green-600 font-semibold mt-1.5">↑ {Math.min(user.mockCount, 3)} this month</div>}
            </div>
          </div>

          {/* Average Score */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-card p-5">
            <div className="flex items-start justify-between">
              <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xs text-slate-500 font-medium">Average Score</div>
              <div className="text-3xl font-extrabold text-slate-900 mt-0.5">{avgPct > 0 ? `${avgPct}%` : "—"}</div>
              <div className="text-xs text-slate-400 mt-0.5">Across all mocks</div>
              {improvement !== 0 && user.mockScores?.length >= 2 && (
                <div className={`text-xs font-semibold mt-1.5 ${improvement >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {improvement >= 0 ? "↑" : "↓"} {Math.abs(improvement).toFixed(1)}% improvement
                </div>
              )}
            </div>
          </div>

          {/* Real Interviews */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-card p-5">
            <div className="flex items-start justify-between">
              <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xs text-slate-500 font-medium">Real Interviews</div>
              <div className="text-3xl font-extrabold text-slate-900 mt-0.5">{user.realInterviews.length}</div>
              <div className="text-xs text-slate-400 mt-0.5">Completed</div>
              {user.realInterviews.length > 0 && <div className="text-xs text-green-600 font-semibold mt-1.5">↑ 1 this month</div>}
            </div>
          </div>

          {/* Highest Score */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-card p-5">
            <div className="flex items-start justify-between">
              <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xs text-slate-500 font-medium">Highest Score</div>
              <div className="text-3xl font-extrabold text-slate-900 mt-0.5">{highestPct > 0 ? `${highestPct}%` : "—"}</div>
              <div className="text-xs text-slate-400 mt-0.5">In {user.role || "Mock"}</div>
              {highestPct > 0 && (
                <button onClick={() => navigate("/interviews")} className="text-xs text-purple-600 font-semibold mt-1.5 hover:underline flex items-center gap-0.5">
                  View all scores →
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Charts row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Performance Overview */}
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl shadow-card p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-slate-800">Performance Overview</h3>
              <select
                className="text-xs bg-slate-50 border border-slate-200 text-slate-600 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-400"
                value={sessionFilter}
                onChange={e => setSessionFilter(Number(e.target.value))}
              >
                <option value={3}>Last 3 Sessions</option>
                <option value={6}>Last 6 Sessions</option>
                <option value={8}>Last 8 Sessions</option>
              </select>
            </div>

            {trendData.length >= 2 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="lineAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                  <Tooltip content={<PerfTooltip />} />
                  <Line
                    type="monotone" dataKey="score" stroke="#7c3aed" strokeWidth={2.5}
                    dot={{ r: 4, fill: "#7c3aed", strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 6, fill: "#7c3aed", stroke: "#fff", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[220px] text-center">
                <div className="text-3xl mb-3">📈</div>
                <p className="text-sm font-medium text-slate-600">No performance data yet</p>
                <p className="text-xs text-slate-400 mt-1">Complete mock interviews to see your score trend</p>
                <button onClick={() => navigate("/interviews")}
                  className="mt-4 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
                  Start First Mock
                </button>
              </div>
            )}
          </div>

          {/* Skills Breakdown */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800">Skills Breakdown</h3>
              <button onClick={() => navigate("/interviews")} className="text-xs text-purple-600 hover:underline font-medium flex items-center gap-0.5">
                View Details →
              </button>
            </div>
            <div className="flex items-center gap-4">
              {/* Donut */}
              <div className="relative shrink-0">
                <PieChart width={140} height={140}>
                  <Pie data={skills} cx={65} cy={65} innerRadius={42} outerRadius={62} dataKey="value" paddingAngle={2}>
                    {skills.map((s, i) => <Cell key={i} fill={s.color} />)}
                  </Pie>
                </PieChart>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="text-base font-extrabold text-slate-900">{overallSkillAvg > 0 ? `${overallSkillAvg}%` : "—"}</div>
                  <div className="text-xs text-slate-400">Overall</div>
                </div>
              </div>
              {/* Legend */}
              <div className="flex-1 space-y-2">
                {skills.map(s => (
                  <div key={s.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                      <span className="text-xs text-slate-600">{s.name}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-700">{s.value}%</span>
                  </div>
                ))}
                {skills.length === 0 && <p className="text-xs text-slate-400">Select a role to see skills.</p>}
              </div>
            </div>
          </div>
        </div>

        {/* ── Sessions + Strengths row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Recent Mock Sessions */}
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl shadow-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800">Recent Mock Sessions</h3>
              <button onClick={() => navigate("/interviews")} className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 font-medium transition-colors">
                View All →
              </button>
            </div>

            {recentSessions.length > 0 ? (
              <div className="space-y-3">
                {recentSessions.map((s, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors border border-slate-100">
                    {/* Session icon */}
                    <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-lg shrink-0">
                      {s.icon}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-800 truncate">{s.title}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{s.role}</div>
                    </div>
                    {/* Score */}
                    <div className={`text-sm font-bold ${s.score >= 80 ? "text-green-600" : s.score >= 65 ? "text-amber-600" : "text-red-500"}`}>
                      {s.score}%
                    </div>
                    {/* Date */}
                    <div className="text-xs text-slate-400 shrink-0 hidden sm:block">{s.date}</div>
                    {/* Review button */}
                    <button onClick={() => navigate("/interviews")}
                      className="shrink-0 border border-slate-200 hover:border-purple-400 hover:text-purple-700 text-slate-600 text-xs font-medium px-3 py-1.5 rounded-lg transition-all">
                      Review
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="text-3xl mb-3">💬</div>
                <p className="text-sm font-medium text-slate-600">No mock sessions yet</p>
                <p className="text-xs text-slate-400 mt-1">Your session history will appear here</p>
                <button onClick={() => navigate("/interviews")}
                  className="mt-4 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
                  Start a Session
                </button>
              </div>
            )}
          </div>

          {/* Strengths & Weaknesses */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-card p-5">
            <div className="grid grid-cols-2 gap-4 h-full">
              {/* Strengths */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                  <span className="text-green-500">✓</span> Your Strengths
                </h4>
                <div className="space-y-2">
                  {strengths.map((s, i) => (
                    <div key={s} className="flex items-center justify-between bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                      <span className="text-xs font-medium text-green-800">{s}</span>
                      <span className="text-xs font-semibold text-green-600">{strengthLabels[i % strengthLabels.length]}</span>
                    </div>
                  ))}
                  {strengths.length === 0 && (
                    <p className="text-xs text-slate-400 py-2">Complete more sessions to see your strengths.</p>
                  )}
                </div>
              </div>
              {/* Weaknesses */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                  <span className="text-red-500">↗</span> Areas to Improve
                </h4>
                <div className="space-y-2">
                  {weaknesses.map((w, i) => (
                    <div key={w} className="flex items-center justify-between bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                      <span className="text-xs font-medium text-red-800">{w}</span>
                      <span className="text-xs font-semibold text-red-500">{weaknessLabels[i % weaknessLabels.length]}</span>
                    </div>
                  ))}
                  {weaknesses.length === 0 && (
                    <p className="text-xs text-slate-400 py-2">No weaknesses detected yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── CTA Banner ── */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 flex items-center justify-between shadow-lg shadow-purple-200">
          <div className="flex items-center gap-4">
            <div className="text-3xl">🚀</div>
            <div>
              <div className="text-base font-bold text-white">Ready for your next challenge?</div>
              <div className="text-sm text-purple-200 mt-0.5">Start a new mock interview and improve your skills!</div>
            </div>
          </div>
          <button
            onClick={() => navigate("/interviews")}
            className="shrink-0 bg-white text-purple-700 font-bold text-sm px-6 py-3 rounded-xl hover:bg-purple-50 transition-colors shadow-sm"
          >
            Start Mock Interview
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const { currentUser, users, setUsers, managedRoles } = useAuth();
  const [accounts, setAccounts] = useState<AccountDto[]>([]);

  useEffect(() => { api.listAccounts().then(setAccounts).catch(() => {}); }, []);

  function updateUser(id: string, patch: Partial<DemoUser>) {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...patch } : u));
  }

  if (!currentUser) return null;

  if (currentUser.isAdmin) return <AdminDashboard />;

  return (
    <UserView
      user={currentUser}
      accounts={accounts}
      managedRoles={managedRoles}
      updateUser={updateUser}
    />
  );
}
