import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import type { AccountDto, RealInterviewLogDto } from "../types";

// ─── Tiny reusable field wrapper ──────────────────────────────────────────────

function Field({
  label, required, hint, children,
}: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

// ─── Icon inside input ────────────────────────────────────────────────────────

function InputWithIcon({
  icon, children,
}: {
  icon: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
        {icon}
      </div>
      <div className="[&>input]:pl-9 [&>select]:pl-9">
        {children}
      </div>
    </div>
  );
}

const BASE_INP =
  "w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition";

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-bold text-purple-700">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RealInterviews() {
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [logs, setLogs] = useState<RealInterviewLogDto[]>([]);

  // Form state
  const [accountName, setAccountName] = useState("");
  const [role, setRole] = useState("");
  const [interviewDate, setInterviewDate] = useState("");
  const [panelist, setPanelist] = useState("");
  const [questions, setQuestions] = useState("");

  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const refresh = () => api.listRealInterviews().then(setLogs).catch(() => {});

  useEffect(() => {
    api.listAccounts().then(setAccounts).catch(() => {});
    refresh();
  }, []);

  // ── Stats from logs ──────────────────────────────────────────────────────────

  const now = new Date();
  const thisMonthCount = logs.filter(l => {
    const d = new Date(l.loggedAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const totalQuestions = logs.reduce((s, l) => s + l.questions.length, 0);

  // ── Validation ───────────────────────────────────────────────────────────────

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!accountName.trim()) e.accountName = "Account name is required.";
    if (!questions.trim())   e.questions   = "Please add at least one question.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const matched = accounts.find(a => a.name.toLowerCase() === accountName.trim().toLowerCase());
    if (!matched) {
      setErrors(prev => ({ ...prev, accountName: "Account not found. Choose from the list." }));
      return;
    }

    const qList = questions.split("\n").map(q => q.trim()).filter(Boolean);
    setBusy(true);
    try {
      await api.logRealInterview(matched.id, panelist.trim(), qList);
      await refresh();
      showToast("success", "Interview saved and questions classified successfully.");
      onClear();
    } catch {
      showToast("error", "Failed to save. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function onClear() {
    setAccountName(""); setRole(""); setInterviewDate(""); setPanelist(""); setQuestions("");
    setErrors({});
  }

  function addMoreQuestion() {
    setQuestions(prev => {
      const trimmed = prev.trimEnd();
      return trimmed ? trimmed + "\n" : "";
    });
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = textareaRef.current.value.length;
      }
    }, 10);
  }

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  // ── Icons (inline SVG) ───────────────────────────────────────────────────────

  const PersonIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
  const BriefcaseIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
  const CalendarIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
  const GroupIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );

  return (
    <div className="min-h-full bg-slate-50">

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg border text-sm font-medium transition-all
          ${toast.type === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          {toast.type === "success"
            ? <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            : <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          }
          {toast.msg}
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Post Interview</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Record the details of your recent interview to track and improve your performance.
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

          {/* ── Main Form (3 cols) ── */}
          <form onSubmit={onSave} className="xl:col-span-3 space-y-5">

            {/* Interview Details card */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-6">
              <SectionHeader
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                }
                title="Interview Details"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Account Name */}
                <Field label="Account Name" required>
                  <InputWithIcon icon={<PersonIcon />}>
                    <input
                      list="account-suggestions"
                      className={`${BASE_INP} ${errors.accountName ? "border-red-400 focus:ring-red-400" : ""}`}
                      placeholder="e.g., Google, Microsoft, Amazon"
                      value={accountName}
                      onChange={e => { setAccountName(e.target.value); setErrors(p => ({ ...p, accountName: "" })); }}
                    />
                  </InputWithIcon>
                  <datalist id="account-suggestions">
                    {accounts.map(a => <option key={a.id} value={a.name} />)}
                  </datalist>
                  {errors.accountName && <p className="text-xs text-red-500 mt-1">{errors.accountName}</p>}
                </Field>

                {/* Role / Position */}
                <Field label="Your Role / Position" required>
                  <InputWithIcon icon={<BriefcaseIcon />}>
                    <input
                      className={BASE_INP}
                      placeholder="e.g., Software Engineer"
                      value={role}
                      onChange={e => setRole(e.target.value)}
                    />
                  </InputWithIcon>
                </Field>

                {/* Interview Date */}
                <Field label="Interview Date" required>
                  <InputWithIcon icon={<CalendarIcon />}>
                    <input
                      type="date"
                      className={BASE_INP}
                      value={interviewDate}
                      onChange={e => setInterviewDate(e.target.value)}
                    />
                  </InputWithIcon>
                </Field>

                {/* Panelist */}
                <Field
                  label="Panelist / Interviewers"
                  required
                  hint="Add multiple interviewers separated by commas."
                >
                  <InputWithIcon icon={<GroupIcon />}>
                    <input
                      className={BASE_INP}
                      placeholder="Enter names and designations"
                      value={panelist}
                      onChange={e => setPanelist(e.target.value)}
                    />
                  </InputWithIcon>
                </Field>

              </div>
            </div>

            {/* Questions Asked card */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-6">
              <SectionHeader
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                title="Questions Asked"
                subtitle="List the questions asked during the interview. Add as many as you remember."
              />

              <textarea
                ref={textareaRef}
                className={`w-full bg-white border rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition resize-y min-h-[160px]
                  ${errors.questions ? "border-red-400 focus:ring-red-400" : "border-slate-300 focus:ring-purple-500"}`}
                placeholder="Enter one question per line…"
                value={questions}
                onChange={e => { setQuestions(e.target.value); setErrors(p => ({ ...p, questions: "" })); }}
              />
              {errors.questions && <p className="text-xs text-red-500 mt-1">{errors.questions}</p>}

              <button
                type="button"
                onClick={addMoreQuestion}
                className="mt-3 flex items-center gap-2 text-sm font-medium text-purple-600 hover:text-purple-700 border border-purple-200 hover:border-purple-400 bg-purple-50 hover:bg-purple-100 rounded-xl px-4 py-2 transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add More Question
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pb-6">
              <button
                type="button"
                onClick={onClear}
                className="px-6 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-xl hover:border-slate-400 hover:bg-slate-50 transition-all"
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={busy}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-xl transition-all shadow-sm shadow-purple-200"
              >
                {busy ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Save Interview
                  </>
                )}
              </button>
            </div>
          </form>

          {/* ── Right Sidebar (1 col) ── */}
          <div className="xl:col-span-1 space-y-5">

            {/* Tips card */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">💡</span>
                <h4 className="text-sm font-bold text-slate-800">Tips</h4>
              </div>
              <div className="space-y-4">
                {[
                  {
                    icon: (
                      <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    ),
                    title: "Be detailed",
                    desc: "Include as many details as possible for better analysis and insights.",
                  },
                  {
                    icon: (
                      <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ),
                    title: "Add all questions",
                    desc: "Try to include all the questions asked during the interview.",
                  },
                  {
                    icon: (
                      <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    ),
                    title: "Review & Reflect",
                    desc: "Review your interviews regularly to identify strengths and areas to improve.",
                  },
                ].map(({ icon, title, desc }) => (
                  <div key={title} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                      {icon}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary card */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <h4 className="text-sm font-bold text-slate-800">Your Summary</h4>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Total Interviews", value: logs.length },
                  { label: "This Month",       value: thisMonthCount },
                  { label: "Questions Logged", value: totalQuestions },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <span className="text-xs font-medium text-slate-600">{label}</span>
                    <span className="text-sm font-bold text-purple-600">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Past interviews accordion */}
            {logs.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-card overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h4 className="text-sm font-bold text-slate-800">Recent Entries</h4>
                </div>
                <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {[...logs].reverse().slice(0, 5).map(log => {
                    const d = new Date(log.loggedAt);
                    return (
                      <div key={log.id} className="px-5 py-3 hover:bg-slate-50 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate">{log.accountName}</p>
                            {log.panelistName && (
                              <p className="text-xs text-slate-400 truncate">{log.panelistName}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-slate-400">{d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                            <p className="text-xs text-purple-600 font-medium">{log.questions.length} Qs</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
