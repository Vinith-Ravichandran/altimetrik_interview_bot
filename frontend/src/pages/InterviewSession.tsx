import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { InterviewSessionDto } from "../types";

export default function InterviewSession() {
  const { id } = useParams<{ id: string }>();
  const { currentUser, setUsers } = useAuth();
  const [session, setSession] = useState<InterviewSessionDto | null>(null);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = () => id && api.getInterview(id).then(setSession);
  useEffect(() => { refresh(); }, [id]);

  if (!session) return (
    <div className="flex items-center justify-center h-40">
      <div className="text-sm text-slate-400">Loading session…</div>
    </div>
  );

  const current  = session.questions.find(q => !q.answer);
  const answered = session.questions.filter(q => q.answer);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!current || !answer.trim()) return;
    setBusy(true);
    try { await api.submitAnswer(current.id, answer.trim()); setAnswer(""); await refresh(); }
    finally { setBusy(false); }
  }

  async function onNext() {
    if (!id) return;
    setBusy(true);
    try { await api.nextQuestion(id); await refresh(); }
    finally { setBusy(false); }
  }

  async function onFinish() {
    if (!id) return;
    setBusy(true);
    try {
      const finished = await api.finishInterview(id);
      setSession(finished);
      if (finished.overallScore != null && currentUser) {
        setUsers(prev => prev.map(u =>
          u.id === currentUser.id
            ? { ...u, mockCount: u.mockCount + 1, mockScores: [...(u.mockScores ?? []), finished.overallScore!] }
            : u,
        ));
      }
    } finally { setBusy(false); }
  }

  const scoreColor = (v: number) => v >= 8 ? "text-green-600" : v >= 6 ? "text-amber-600" : "text-red-600";
  const scoreBg    = (v: number) => v >= 8 ? "bg-green-50"   : v >= 6 ? "bg-amber-50"   : "bg-red-50";

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">{session.roleName}</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          {session.accountName} · Started {new Date(session.startedAt).toLocaleString()}
        </p>
        <div className="w-10 h-0.5 bg-purple-600 mt-2" />
      </div>

      {/* Answered questions */}
      <div className="space-y-4 mb-4">
        {answered.map(q => (
          <div key={q.id} className="bg-white border border-slate-200 rounded-xl shadow-card p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Question {q.orderIndex + 1}</p>
            <p className="text-sm font-semibold text-slate-800 mb-3">{q.text}</p>
            <div className="bg-slate-50 border-l-2 border-slate-300 pl-3 rounded-r py-2">
              <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">{q.answer?.text}</p>
            </div>
            {q.answer?.evaluation && (
              <div className="mt-3 border border-slate-200 rounded-xl overflow-hidden">
                <div className="grid grid-cols-4 divide-x divide-slate-200">
                  {[
                    { label: "Clarity",  val: q.answer.evaluation.clarity },
                    { label: "Depth",    val: q.answer.evaluation.depth },
                    { label: "Quality",  val: q.answer.evaluation.quality },
                    { label: "Overall",  val: q.answer.evaluation.overall },
                  ].map(({ label, val }) => (
                    <div key={label} className={`text-center py-3 ${scoreBg(val)}`}>
                      <div className="text-xs text-slate-400 mb-0.5">{label}</div>
                      <div className={`text-lg font-bold ${scoreColor(val)}`}>{val.toFixed(1)}</div>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t border-slate-200 space-y-1">
                  {q.answer.evaluation.strengths && (
                    <p className="text-xs text-green-700">
                      <span className="font-semibold">✓ Strengths: </span>{q.answer.evaluation.strengths}
                    </p>
                  )}
                  {q.answer.evaluation.improvements && (
                    <p className="text-xs text-amber-700">
                      <span className="font-semibold">↑ Improve: </span>{q.answer.evaluation.improvements}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Current question */}
      {current && (
        <form onSubmit={onSubmit} className="bg-white border border-slate-200 rounded-xl shadow-card p-5 mb-4">
          <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Question {current.orderIndex + 1}</p>
          <p className="text-sm font-semibold text-slate-800 mb-4">{current.text}</p>
          <textarea
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition h-32 resize-none"
            placeholder="Type your answer…"
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            disabled={busy}
          />
          <button disabled={busy || !answer.trim()}
            className="mt-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-lg px-5 py-2 text-sm font-semibold transition-colors shadow-sm">
            {busy ? "Evaluating…" : "Submit Answer"}
          </button>
        </form>
      )}

      {/* Controls */}
      <div className="flex gap-3">
        {!current && !session.completedAt && (
          <button onClick={onNext} disabled={busy}
            className="bg-white border border-slate-300 hover:border-purple-400 hover:text-purple-700 text-slate-700 rounded-lg px-5 py-2 text-sm font-semibold transition-all shadow-sm disabled:opacity-40">
            {busy ? "Generating…" : "Next Question →"}
          </button>
        )}
        {!session.completedAt && (
          <button onClick={onFinish} disabled={busy}
            className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-5 py-2 text-sm font-semibold transition-colors shadow-sm disabled:opacity-40">
            Finish &amp; Get Report
          </button>
        )}
      </div>

      {/* Final report */}
      {session.completedAt && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 mt-5">
          <h3 className="text-sm font-bold text-green-800 mb-3">Final Report</h3>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-xs text-green-700 font-medium">Overall Score</span>
            <span className="text-4xl font-extrabold text-green-600">{session.overallScore?.toFixed(1) ?? "—"}</span>
            <span className="text-sm text-green-500">/ 10</span>
          </div>
          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{session.overallFeedback}</p>
        </div>
      )}
    </div>
  );
}
