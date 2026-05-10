import { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../api/client";

interface ScoreBreakdown {
  clarity: number;  clarityJustification: string;
  depth: number;    depthJustification: string;
  quality: number;  qualityJustification: string;
  overall: number;
  feedback: string;
  improvedAnswer: string;
}

interface QARecord {
  question: string;
  answer: string;
  scores: ScoreBreakdown;
  followup: boolean;
}

type Phase = "interview" | "report";

function scoreBand(s: number) {
  if (s >= 8) return { color: "text-green-600", bg: "bg-green-50", border: "border-green-200", label: "Excellent" };
  if (s >= 6) return { color: "text-blue-600",  bg: "bg-blue-50",  border: "border-blue-200",  label: "Good" };
  if (s >= 4) return { color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", label: "Fair" };
  return         { color: "text-red-500",   bg: "bg-red-50",   border: "border-red-200",   label: "Weak" };
}

function ScorePill({ label, score, justification }: { label: string; score: number; justification: string }) {
  const [open, setOpen] = useState(false);
  const b = scoreBand(score);
  return (
    <div className={`rounded-xl border ${b.border} ${b.bg} overflow-hidden`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-600 w-14">{label}</span>
          <div className="w-24 h-1.5 bg-white/60 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${b.color.replace("text-","bg-")}`}
              style={{ width: `${score * 10}%` }} />
          </div>
          <span className={`text-sm font-bold ${b.color}`}>{score.toFixed(1)}/10</span>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${b.bg} ${b.color}`}>
            {b.label}
          </span>
        </div>
        <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
        </svg>
      </button>
      {open && justification && (
        <div className="px-4 pb-3">
          <p className="text-xs text-gray-600 leading-relaxed border-t border-white/60 pt-2">
            {justification}
          </p>
        </div>
      )}
    </div>
  );
}

export default function BotInterviewSession() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const textRef    = useRef<HTMLTextAreaElement>(null);

  // Session params passed via navigation state
  const { sessionId: initSessionId, firstQuestion, company, role } =
    (location.state as any) ?? {};

  const [sessionId,     setSessionId]     = useState<string>(initSessionId ?? "");
  const [question,      setQuestion]      = useState<string>(firstQuestion ?? "");
  const [answer,        setAnswer]        = useState("");
  const [history,       setHistory]       = useState<QARecord[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [ending,        setEnding]        = useState(false);
  const [error,         setError]         = useState("");
  const [phase,         setPhase]         = useState<Phase>("interview");
  const [report,        setReport]        = useState<any>(null);
  const [expandedIdx,   setExpandedIdx]   = useState<number | null>(null);

  // If navigated without state, show error
  if (!sessionId || !question) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center px-4">
        <p className="text-gray-500 mb-4">No active session. Please start a new interview.</p>
        <button onClick={() => navigate("/interviews")}
          className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold">
          Go to Interviews
        </button>
      </div>
    );
  }

  async function handleSubmit() {
    if (!answer.trim() || loading) return;
    setLoading(true);
    setError("");
    const submitted = answer.trim();
    setAnswer("");
    try {
      const res = await api.submitBotAnswer(sessionId, submitted);

      const record: QARecord = {
        question,
        answer: submitted,
        followup: history.length > 0 && !res.isComplete,
        scores: {
          clarity:              res.clarity,
          clarityJustification: res.clarityJustification,
          depth:                res.depth,
          depthJustification:   res.depthJustification,
          quality:              res.quality,
          qualityJustification: res.qualityJustification,
          overall:              res.overall,
          feedback:             res.feedback,
          improvedAnswer:       res.improvedAnswer,
        },
      };
      setHistory(h => [...h, record]);
      setExpandedIdx(history.length); // auto-expand the latest

      if (res.isComplete) {
        await doEnd();
      } else {
        setQuestion(res.nextQuestion!);
        setTimeout(() => textRef.current?.focus(), 100);
      }
    } catch (e: any) {
      const msg: string = e?.response?.data?.details ?? e?.response?.data?.error ?? "Failed to submit.";
      if (msg.toLowerCase().includes("session not found")) {
        setError("⚠️ Session expired. Please start a new interview.");
      } else {
        setError(msg);
      }
      setAnswer(submitted); // restore answer on error
    } finally {
      setLoading(false);
    }
  }

  async function doEnd() {
    setEnding(true);
    try {
      const res = await api.endBotInterview(sessionId);
      setReport(res);
      setPhase("report");
    } catch (e: any) {
      setError("Failed to generate report. Please try again.");
    } finally {
      setEnding(false);
    }
  }

  // ── Report phase ─────────────────────────────────────────────────────────
  if (phase === "report" && report) {
    const avgClarity  = history.length ? history.reduce((s, q) => s + q.scores.clarity, 0)  / history.length : 0;
    const avgDepth    = history.length ? history.reduce((s, q) => s + q.scores.depth, 0)    / history.length : 0;
    const avgQuality  = history.length ? history.reduce((s, q) => s + q.scores.quality, 0)  / history.length : 0;

    return (
      <div className="max-w-2xl mx-auto py-10 px-4 space-y-6">
        {/* Overall score */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-8 text-white text-center">
          <h2 className="text-xl font-bold mb-1">Interview Complete</h2>
          <p className="text-indigo-200 text-sm mb-4">{company} · {role}</p>
          <div className="text-6xl font-extrabold">{report.overallScore.toFixed(1)}
            <span className="text-2xl text-indigo-200">/10</span>
          </div>
          <div className="inline-block mt-2 px-4 py-1.5 bg-white/20 rounded-full text-sm font-semibold">
            {report.skillLevel}
          </div>
          {/* Dimension averages */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            {[["Clarity", avgClarity], ["Depth", avgDepth], ["Quality", avgQuality]].map(([l, v]) => (
              <div key={l as string} className="bg-white/10 rounded-xl py-3">
                <p className="text-2xl font-bold">{(v as number).toFixed(1)}</p>
                <p className="text-xs text-indigo-200 mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Strengths / Weaknesses */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-xs">✓</span>
              Strengths
            </h3>
            <ul className="space-y-1.5">
              {report.strengths?.map((s: string, i: number) => (
                <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0"/>
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center text-red-500 text-xs">↗</span>
              Improve
            </h3>
            <ul className="space-y-1.5">
              {report.weaknesses?.map((w: string, i: number) => (
                <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0"/>
                  {w}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Q&A review */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Question-by-Question Review</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {history.map((item, i) => (
              <div key={i} className="p-5">
                <button onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                  className="w-full text-left flex items-start justify-between gap-3 group">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm font-medium text-gray-800 truncate">{item.question}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-sm font-bold ${scoreBand(item.scores.overall).color}`}>
                      {item.scores.overall.toFixed(1)}/10
                    </span>
                    <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expandedIdx === i ? "rotate-180" : ""}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                    </svg>
                  </div>
                </button>
                {expandedIdx === i && (
                  <div className="mt-4 space-y-4">
                    <div className="bg-gray-50 rounded-xl px-4 py-3 border-l-2 border-gray-300">
                      <p className="text-xs text-gray-400 mb-1">Your answer</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{item.answer}</p>
                    </div>
                    <div className="space-y-2">
                      <ScorePill label="Clarity"  score={item.scores.clarity}  justification={item.scores.clarityJustification} />
                      <ScorePill label="Depth"    score={item.scores.depth}    justification={item.scores.depthJustification} />
                      <ScorePill label="Quality"  score={item.scores.quality}  justification={item.scores.qualityJustification} />
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed">
                      <p className="text-xs font-semibold text-gray-500 mb-1.5">Overall feedback</p>
                      {item.scores.feedback}
                    </div>
                    {item.scores.improvedAnswer && (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                        <p className="text-xs font-semibold text-green-700 mb-1.5">
                          💡 How to answer more professionally
                        </p>
                        <p className="text-sm text-gray-700 leading-relaxed">{item.scores.improvedAnswer}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={() => navigate("/interviews")}
            className="flex-1 py-3 rounded-xl font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50">
            New Interview
          </button>
          <button onClick={() => navigate("/", {
              state: {
                refreshMetrics: true,
                lastReport: {
                  overallScore: report.overallScore,
                  skillLevel:   report.skillLevel,
                  company,
                  role,
                  strengths:    report.strengths,
                  weaknesses:   report.weaknesses,
                  avgClarity,
                  avgDepth,
                  avgQuality,
                },
              }
            })}
            className="flex-1 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-200">
            View Dashboard →
          </button>
        </div>
      </div>
    );
  }

  // ── Interview phase ───────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-sm">{company} · {role}</h2>
            <p className="text-xs text-gray-400">{history.length} question{history.length !== 1 ? "s" : ""} answered</p>
          </div>
        </div>
        <button onClick={() => { if (confirm("End interview and get full report?")) doEnd(); }}
          disabled={ending}
          className="px-4 py-2 text-sm font-semibold rounded-xl border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50">
          {ending ? "Generating…" : "End & Get Report"}
        </button>
      </div>

      {/* Previous Q&A with score breakdown */}
      {history.map((item, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <button onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
            className="w-full flex items-start gap-3 px-5 py-4 hover:bg-gray-50 transition-colors text-left">
            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{item.question}</p>
              <p className="text-xs text-gray-400 mt-0.5 truncate">{item.answer}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-sm font-bold ${scoreBand(item.scores.overall).color}`}>
                {item.scores.overall.toFixed(1)}/10
              </span>
              <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expandedIdx === i ? "rotate-180" : ""}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
              </svg>
            </div>
          </button>

          {expandedIdx === i && (
            <div className="px-5 pb-5 space-y-4 bg-gray-50 border-t border-gray-100">
              <div className="bg-white rounded-xl px-4 py-3 mt-3 border-l-2 border-gray-200">
                <p className="text-xs text-gray-400 mb-1">Your answer</p>
                <p className="text-sm text-gray-700 leading-relaxed">{item.answer}</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Score Breakdown — click each to see why</p>
                <ScorePill label="Clarity"  score={item.scores.clarity}  justification={item.scores.clarityJustification} />
                <ScorePill label="Depth"    score={item.scores.depth}    justification={item.scores.depthJustification} />
                <ScorePill label="Quality"  score={item.scores.quality}  justification={item.scores.qualityJustification} />
              </div>
              <p className="text-sm text-gray-600 leading-relaxed bg-white rounded-xl px-4 py-3">
                {item.scores.feedback}
              </p>
              {item.scores.improvedAnswer && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-green-700 mb-1.5">💡 How to answer this more professionally</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{item.scores.improvedAnswer}</p>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Current question input */}
      <div className="bg-white rounded-2xl border-2 border-indigo-200 shadow-sm p-5">
        <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-2">
          Question {history.length + 1}
        </p>
        <p className="text-base font-semibold text-gray-900 mb-4 leading-relaxed">{question}</p>
        <textarea
          ref={textRef}
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit(); }}
          rows={4}
          placeholder="Type your answer… (Ctrl+Enter to submit)"
          disabled={loading}
          className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
        />
        {error && (
          <div className="mt-2 text-xs text-red-600 flex items-center gap-1">
            {error}
            {error.includes("expired") && (
              <button onClick={() => navigate("/interviews")} className="underline ml-1">Start new →</button>
            )}
          </div>
        )}
        <button onClick={handleSubmit} disabled={!answer.trim() || loading}
          className="mt-3 w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
          {loading ? "Evaluating…" : "Submit Answer →"}
        </button>
      </div>
    </div>
  );
}
