import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { AccountDto, DocumentDto, RoleDto } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function formatDate(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
  };
}

// localStorage metadata: track account/role per uploaded document
const META_KEY = "interviewPrep.docMeta";
type DocMeta = Record<string, { accountName: string; roleName: string }>;

function loadMeta(): DocMeta {
  try { return JSON.parse(localStorage.getItem(META_KEY) ?? "{}"); } catch { return {}; }
}
function saveMeta(m: DocMeta) { localStorage.setItem(META_KEY, JSON.stringify(m)); }

// Clearbit logo lookup
const CLEARBIT: Record<string, string> = {
  ford: "ford.com", fordpro: "ford.com", paypal: "paypal.com",
  amazon: "amazon.com", microsoft: "microsoft.com", google: "google.com",
  apple: "apple.com", meta: "meta.com", netflix: "netflix.com",
  msxi: "msxi.com", altimetrik: "altimetrik.com",
};
function logoUrl(name: string, backendUrl?: string | null): string | null {
  if (backendUrl) return backendUrl;
  const d = CLEARBIT[name.toLowerCase()];
  return d ? `https://logo.clearbit.com/${d}` : null;
}

const AVATAR_BG = ["bg-blue-500","bg-purple-500","bg-green-500","bg-amber-500","bg-red-500","bg-indigo-500"];
function avatarBg(name: string) { return AVATAR_BG[name.charCodeAt(0) % AVATAR_BG.length]; }

// ─── PDF Icon ─────────────────────────────────────────────────────────────────

function PdfIcon() {
  return (
    <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
      <span className="text-red-600 text-xs font-extrabold">PDF</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Documents() {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.isAdmin ?? false;

  const [docs, setDocs] = useState<DocumentDto[]>([]);
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [allRoles, setAllRoles] = useState<RoleDto[]>([]);
  const [docMeta, setDocMeta] = useState<DocMeta>(loadMeta);

  // Upload state
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [uploadAccount, setUploadAccount] = useState("");
  const [uploadRole, setUploadRole] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Filter & search state
  const [filterAccount, setFilterAccount] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

  const refresh = () => api.listDocuments().then(setDocs).catch(() => {});

  useEffect(() => {
    refresh();
    api.listAccounts().then(setAccounts).catch(() => {});
    api.listRoles().then(setAllRoles).catch(() => {});
  }, []);

  // ── Upload logic ────────────────────────────────────────────────────────────

  async function handleUpload(file: File) {
    setUploading(true);
    setUploadMsg(null);
    try {
      const doc = await api.uploadDocument(file);
      // Store account/role metadata locally
      if (uploadAccount || uploadRole) {
        const updated = { ...docMeta, [doc.id]: { accountName: uploadAccount, roleName: uploadRole } };
        setDocMeta(updated);
        saveMeta(updated);
      }
      await refresh();
      setUploadMsg({ type: "success", text: "File uploaded and converted to PDF successfully." });
      if (fileRef.current) fileRef.current.value = "";
      setTimeout(() => setUploadMsg(null), 4000);
    } catch (err: any) {
      setUploadMsg({ type: "error", text: err?.response?.data?.error ?? "Upload failed. Please try again." });
    } finally {
      setUploading(false);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  }, [uploadAccount, uploadRole, docMeta]);

  // ── Stats ───────────────────────────────────────────────────────────────────

  const totalDocs = docs.length;
  const latestDate = docs.length > 0
    ? formatDate(docs.reduce((a, b) => (a.uploadedAt > b.uploadedAt ? a : b)).uploadedAt).date
    : "—";

  const availableForUser = docs.filter(d => {
    const meta = docMeta[d.id];
    if (!meta) return true;
    const roleMatch = !currentUser?.role || !meta.roleName || meta.roleName.toLowerCase().includes(currentUser.role.toLowerCase());
    return roleMatch;
  }).length;

  // ── Filtered documents ──────────────────────────────────────────────────────

  const filtered = docs.filter(d => {
    const meta = docMeta[d.id];
    if (search && !d.filename.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterAccount !== "all" && meta?.accountName !== filterAccount) return false;
    if (filterRole !== "all" && meta?.roleName !== filterRole) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Unique account/role names from meta
  const metaAccounts = [...new Set(Object.values(docMeta).map(m => m.accountName).filter(Boolean))];
  const metaRoles    = [...new Set(Object.values(docMeta).map(m => m.roleName).filter(Boolean))];

  async function onDelete(id: string) {
    if (!confirm("Delete this document?")) return;
    await api.deleteDocument(id);
    const updated = { ...docMeta };
    delete updated[id];
    setDocMeta(updated);
    saveMeta(updated);
    refresh();
  }

  const selCls = "bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition";

  return (
    <div className="min-h-full bg-slate-50">

      {/* ── Page Header ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Study Material</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Upload any file (DOCX, TXT, PDF, etc.) — we will convert it to PDF. You can download only PDF files.
            </p>
          </div>
          {/* Info card */}
          <div className="flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 max-w-xs">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-xs text-slate-700">
              We support all file types as input.{" "}
              <span className="text-purple-600 font-semibold">Output will always be PDF.</span>
            </div>
            <div className="flex items-center gap-1 shrink-0 text-slate-400 text-xs">
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <span className="text-slate-400">→</span>
              <span className="bg-red-100 text-red-600 font-bold text-xs px-1.5 py-0.5 rounded">PDF</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-5">

        {/* ── Upload + Dropdowns ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Drag & drop zone */}
          <div className="lg:col-span-2 space-y-3">
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => !uploading && fileRef.current?.click()}
              className={`
                relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed cursor-pointer
                transition-all duration-200 py-12 px-6
                ${dragOver ? "border-purple-500 bg-purple-50/80 scale-[1.01]" : "border-purple-300 bg-purple-50/30 hover:border-purple-400 hover:bg-purple-50/60"}
                ${uploading ? "cursor-not-allowed opacity-70" : ""}
              `}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx"
                onChange={onFileChange}
                disabled={uploading}
                className="hidden"
              />
              {uploading ? (
                <>
                  <div className="w-12 h-12 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin" />
                  <p className="text-sm font-semibold text-purple-700">Converting to PDF…</p>
                  <p className="text-xs text-slate-400">Please wait while we process your file</p>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center">
                    <svg className="w-7 h-7 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-700">
                      Drag &amp; drop your file here
                    </p>
                    <p className="text-sm">
                      <span className="text-purple-600 font-semibold hover:underline">or click to browse</span>
                    </p>
                  </div>
                  <p className="text-xs text-slate-400">Supported formats: PDF, DOCX, DOC, TXT and more</p>
                </>
              )}
            </div>

            {/* Upload feedback */}
            {uploadMsg && (
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border ${uploadMsg.type === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}>
                {uploadMsg.type === "success"
                  ? <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  : <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                }
                {uploadMsg.text}
              </div>
            )}

            {/* Conversion info banner */}
            <div className="flex items-center gap-3 bg-purple-50/50 border border-purple-100 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-purple-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              <p className="text-xs text-slate-600">Your file will be converted to PDF and stored securely.</p>
            </div>
          </div>

          {/* Account & Role dropdowns */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">Account</label>
              <div className="relative">
                <select
                  className={`${selCls} w-full`}
                  value={uploadAccount}
                  onChange={e => setUploadAccount(e.target.value)}
                >
                  <option value="">Select account…</option>
                  {accounts.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                </select>
                {uploadAccount && accounts.find(a => a.name === uploadAccount) && (
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    {/* Account logo preview handled by select text */}
                  </div>
                )}
              </div>
              {uploadAccount && (
                <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-white border border-slate-200 rounded-lg">
                  {logoUrl(uploadAccount) ? (
                    <img src={logoUrl(uploadAccount)!} alt={uploadAccount} className="h-4 w-auto object-contain max-w-[32px]"
                      onError={e => (e.currentTarget.style.display = "none")} />
                  ) : (
                    <div className={`w-5 h-5 rounded-full ${avatarBg(uploadAccount)} text-white text-xs flex items-center justify-center font-bold`}>
                      {uploadAccount.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs font-medium text-slate-700">{uploadAccount}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">Role</label>
              <select
                className={`${selCls} w-full`}
                value={uploadRole}
                onChange={e => setUploadRole(e.target.value)}
              >
                <option value="">Select role…</option>
                {allRoles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
              </select>
              {uploadRole && (
                <span className="inline-block mt-2 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-medium px-3 py-1 rounded-full">
                  {uploadRole}
                </span>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mt-2">
              <p className="text-xs text-blue-700 font-medium mb-1">Tip</p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tag your document with an account and role so team members can find it easily when filtering.
              </p>
            </div>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: (
                <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              ),
              iconBg: "bg-purple-100",
              label: "Total Materials",
              value: totalDocs,
              sub: "Across all accounts & roles",
            },
            {
              icon: (
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
              iconBg: "bg-green-100",
              label: "Available for You",
              value: availableForUser,
              sub: "Materials you can access",
            },
            {
              icon: (
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              ),
              iconBg: "bg-amber-100",
              label: "Converted to PDF",
              value: totalDocs > 0 ? "100%" : "—",
              sub: "All files are in PDF format",
            },
            {
              icon: (
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              ),
              iconBg: "bg-blue-100",
              label: "Last Updated",
              value: latestDate,
              sub: totalDocs > 0 ? "Most recent upload" : "No uploads yet",
            },
          ].map(({ icon, iconBg, label, value, sub }) => (
            <div key={label} className="bg-white border border-slate-200 rounded-xl shadow-card p-5 flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
                {icon}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-slate-500">{label}</div>
                <div className="text-xl font-extrabold text-slate-900 mt-0.5 truncate">{value}</div>
                <div className="text-xs text-slate-400 mt-0.5 truncate">{sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Document Table ── */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-card overflow-hidden">

          {/* Table header */}
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Your Study Materials</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {filtered.length > 0
                    ? `Showing ${Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length} materials`
                    : "No materials found"}
                </p>
              </div>
              {/* Search */}
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 w-52 transition"
                  placeholder="Search documents…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 mt-4 flex-wrap">
              <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-3 py-1.5 bg-white">
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" /></svg>
                <select className="text-xs text-slate-700 bg-transparent focus:outline-none"
                  value={filterAccount} onChange={e => { setFilterAccount(e.target.value); setPage(1); }}>
                  <option value="all">All Accounts</option>
                  {metaAccounts.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-3 py-1.5 bg-white">
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01" /></svg>
                <select className="text-xs text-slate-700 bg-transparent focus:outline-none"
                  value={filterRole} onChange={e => { setFilterRole(e.target.value); setPage(1); }}>
                  <option value="all">All Roles</option>
                  {metaRoles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-3 py-1.5 bg-white">
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <select className="text-xs text-slate-700 bg-transparent focus:outline-none"
                  value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }}>
                  <option value="all">All File Types</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>

              <button
                onClick={() => { setFilterAccount("all"); setFilterRole("all"); setFilterType("all"); setSearch(""); setPage(1); }}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-3 py-1.5 bg-white hover:border-slate-300 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Reset
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-slate-50 text-slate-500 text-xs border-b border-slate-100">
                <tr>
                  <th className="text-left px-6 py-3 font-medium">File Name</th>
                  <th className="text-left px-4 py-3 font-medium">Type (Output)</th>
                  <th className="text-left px-4 py-3 font-medium">Account</th>
                  <th className="text-left px-4 py-3 font-medium">Role</th>
                  <th className="text-left px-4 py-3 font-medium">Uploaded On</th>
                  <th className="text-left px-4 py-3 font-medium">Size</th>
                  <th className="text-center px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(doc => {
                  const meta = docMeta[doc.id];
                  const { date, time } = formatDate(doc.uploadedAt);
                  const acctLogo = meta?.accountName ? logoUrl(meta.accountName) : null;

                  return (
                    <tr key={doc.id} className="border-t border-slate-100 hover:bg-slate-50/60 transition-colors">

                      {/* File Name */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <PdfIcon />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-800 truncate max-w-[220px]">{doc.filename}</div>
                            <span className="inline-block mt-1 bg-green-50 border border-green-200 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
                              Converted to PDF
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          <PdfIcon />
                          <span className="text-xs font-semibold text-slate-700">PDF</span>
                        </div>
                      </td>

                      {/* Account */}
                      <td className="px-4 py-4">
                        {meta?.accountName ? (
                          <div className="flex items-center gap-2">
                            {acctLogo ? (
                              <img src={acctLogo} alt={meta.accountName} className="h-4 w-auto max-w-[32px] object-contain"
                                onError={e => (e.currentTarget.style.display = "none")} />
                            ) : (
                              <div className={`w-5 h-5 rounded-full ${avatarBg(meta.accountName)} text-white text-xs flex items-center justify-center font-bold`}>
                                {meta.accountName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="text-xs font-medium text-slate-700">{meta.accountName}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>

                      {/* Role */}
                      <td className="px-4 py-4">
                        {meta?.roleName ? (
                          <span className="bg-purple-50 border border-purple-200 text-purple-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
                            {meta.roleName}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>

                      {/* Uploaded On */}
                      <td className="px-4 py-4">
                        <div className="text-xs font-medium text-slate-700">{date}</div>
                        <div className="text-xs text-slate-400">{time}</div>
                      </td>

                      {/* Size */}
                      <td className="px-4 py-4 text-xs font-medium text-slate-600">{formatSize(doc.sizeBytes)}</td>

                      {/* Action */}
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* Download */}
                          <a
                            href={api.exportUrl(doc.id, "pdf")}
                            download
                            className="w-8 h-8 rounded-lg border border-slate-200 hover:border-purple-400 hover:bg-purple-50 flex items-center justify-center transition-all group"
                            title="Download PDF"
                          >
                            <svg className="w-4 h-4 text-slate-500 group-hover:text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </a>
                          {/* Admin-only delete */}
                          {isAdmin && (
                            <button
                              onClick={() => onDelete(doc.id)}
                              className="w-8 h-8 rounded-lg border border-slate-200 hover:border-red-300 hover:bg-red-50 flex items-center justify-center transition-all group"
                              title="Delete document"
                            >
                              <svg className="w-4 h-4 text-slate-400 group-hover:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {paged.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                          <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-600">
                            {search || filterAccount !== "all" || filterRole !== "all"
                              ? "No documents match your filters"
                              : "No study materials available for your role"}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {search || filterAccount !== "all" || filterRole !== "all"
                              ? "Try adjusting your search or filters"
                              : "Upload your first document using the drag & drop zone above"}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} materials
              </span>
              <div className="flex items-center gap-1">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-purple-400 hover:text-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs">‹</button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(n => (
                  <button key={n} onClick={() => setPage(n)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg border text-xs font-medium transition-all ${page === n ? "bg-purple-600 border-purple-600 text-white" : "border-slate-200 text-slate-500 hover:border-purple-400 hover:text-purple-700"}`}>
                    {n}
                  </button>
                ))}
                {totalPages > 5 && <><span className="text-slate-400 text-xs">…</span>
                  <button onClick={() => setPage(totalPages)} className={`w-8 h-8 flex items-center justify-center rounded-lg border text-xs font-medium transition-all ${page === totalPages ? "bg-purple-600 border-purple-600 text-white" : "border-slate-200 text-slate-500 hover:border-purple-400"}`}>{totalPages}</button></>}
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-purple-400 hover:text-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs">›</button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
