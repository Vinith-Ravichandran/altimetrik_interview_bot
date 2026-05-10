import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../api/client";

interface QA {
  question: string;
  answer: string;
  score: number;
  feedback: string;
  improvedAnswer: string;
  difficulty: string;
}

type Phase = "select" | "interview" | "result";

const TECH_STACKS = [
  { label: "SQL",        icon: "🗄️",  color: "bg-blue-50 border-blue-200 text-blue-700" },
  { label: "Python",     icon: "🐍",  color: "bg-yellow-50 border-yellow-200 text-yellow-700" },
  { label: "Java",       icon: "☕",  color: "bg-orange-50 border-orange-200 text-orange-700" },
  { label: "GCP",        icon: "☁️",  color: "bg-sky-50 border-sky-200 text-sky-700" },
  { label: "BigQuery",   icon: "📊",  color: "bg-purple-50 border-purple-200 text-purple-700" },
  { label: "Backend",    icon: "⚙️",  color: "bg-gray-50 border-gray-200 text-gray-700" },
  { label: "Frontend",   icon: "🎨",  color: "bg-pink-50 border-pink-200 text-pink-700" },
  { label: "AWS",        icon: "🟠",  color: "bg-amber-50 border-amber-200 text-amber-700" },
  { label: "Docker",     icon: "🐳",  color: "bg-cyan-50 border-cyan-200 text-cyan-700" },
  { label: "Kubernetes", icon: "⎈",   color: "bg-indigo-50 border-indigo-200 text-indigo-700" },
  { label: "React",      icon: "⚛️",  color: "bg-teal-50 border-teal-200 text-teal-700" },
  { label: "Spring Boot",icon: "🍃",  color: "bg-green-50 border-green-200 text-green-700" },
];

function scoreColor(s: number) {
  if (s >= 8) return "text-green-600 bg-green-50";
  if (s >= 6) return "text-blue-600 bg-blue-50";
  if (s >= 4) return "text-amber-600 bg-amber-50";
  return "text-red-600 bg-red-50";
}

function difficultyBadge(d: string) {
  const map: Record<string, string> = {
    Basic:        "bg-green-100 text-green-700",
    Intermediate: "bg-blue-100 text-blue-700",
    Advanced:     "bg-purple-100 text-purple-700",
  };
  return `text-xs font-semibold px-2 py-0.5 rounded-full ${map[d] ?? "bg-gray-100 text-gray-600"}`;
}

export default function TechStackInterview() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [phase,      setPhase]      = useState<Phase>("select");
  const [selected,   setSelected]   = useState("");
  const [sessionId,  setSessionId]  = useState("");
  const [techStack,  setTechStack]  = useState("");
  const [question,   setQuestion]   = useState("");
  const [difficulty, setDifficulty] = useState("Basic");
  const [answer,     setAnswer]     = useState("");
  const [history,    setHistory]    = useState<QA[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [ending,     setEnding]     = useState(false);
  const [expanded,   setExpanded]   = useState<number | null>(null);
  const [result,     setResult]     = useState<any>(null);
  const [error,      setError]      = useState("");

  // If navigated here with a pre-selected stack
  useEffect(() => {
    const state = location.state as any;
    if (state?.techStack) setSelected(state.techStack);
  }, []);

  async function handleStart() {
    if (!selected) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.startTechStack(selected);
      setSessionId(res.sessionId);
      setTechStack(res.techStack);
      setQuestion(res.firstQuestion);
      setDifficulty(res.difficulty);
      setPhase("interview");
      setTimeout(() => textareaRef.current?.focus(), 100);
    } catch (e: any) {
      setError(e?.response?.data?.details ?? "Failed to start. Check Claude API key.");
    } finally {
      setLoading(false);
    }
  }

  function isSessionExpired(e: any): boolean {
    const details: string = e?.response?.data?.details ?? "";
    return details.toLowerCase().includes("session not found") ||
           details.toLowerCase().includes("not found");
  }

  async function handleSubmit() {
    if (!answer.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.submitTechAnswer(sessionId, answer.trim());
      setHistory(h => [...h, {
        question, answer: answer.trim(),
        score: res.score, feedback: res.feedback,
        improvedAnswer: res.improvedAnswer,
        difficulty,
      }]);
      setAnswer("");
      if (res.isComplete) {
        await doEnd();
      } else {
        setQuestion(res.nextQuestion!);
        setDifficulty(res.difficulty ?? "Intermediate");
        setTimeout(() => textareaRef.current?.focus(), 100);
      }
    } catch (e: any) {
      if (isSessionExpired(e)) {
        setError("⚠️ Session expired (server was restarted). Please start a new interview.");
      } else {
        setError(e?.response?.data?.details ?? e?.response?.data?.error ?? "Failed to submit answer.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function doEnd() {
    setEnding(true);
    try {
      const res = await api.endTechStack(sessionId);
      setResult(res);
      setPhase("result");
    } catch (e: any) {
      if (isSessionExpired(e)) {
        setError("⚠️ Session expired (server was restarted). Please start a new interview.");
        setPhase("select");
      } else {
        setError(e?.response?.data?.details ?? "Failed to generate report.");
      }
    } finally {
      setEnding(false);
    }
  }

  // ── Phase: Select Tech Stack ──────────────────────────────────────────────
  if (phase === "select") return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <button onClick={() => navigate("/interviews")}
        className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-6 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
        </svg>
        Back to Interviews
      </button>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 mb-4">
            <span className="text-3xl">⎈</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Tech Stack Evaluation</h1>
          <p className="text-gray-500 text-sm mt-2">
            Choose a technology. The AI will ask questions from basic to advanced, adapting to your responses.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {TECH_STACKS.map(t => (
            <button key={t.label} onClick={() => setSelected(t.label)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                ${selected === t.label
                  ? "border-indigo-500 bg-indigo-50 shadow-sm scale-105"
                  : `${t.color} border hover:scale-102`}`}>
              <span className="text-2xl">{t.icon}</span>
              <span className="text-xs font-semibold">{t.label}</span>
            </button>
          ))}
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2 mb-4">{error}</p>}

        <button onClick={handleStart} disabled={!selected || loading}
          className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-200">
          {loading ? "Starting…" : selected ? `Start ${selected} Evaluation →` : "Select a Technology"}
        </button>
      </div>
    </div>
  );

  // ── Phase: Interview ──────────────────────────────────────────────────────
  if (phase === "interview") return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <span className="text-lg">{TECH_STACKS.find(t => t.label === techStack)?.icon ?? "💻"}</span>
          </div>
          <div>
            <h2 className="font-bold text-gray-900">{techStack} Evaluation</h2>
            <p className="text-xs text-gray-400">{history.length} question{history.length !== 1 ? "s" : ""} answered</p>
          </div>
        </div>
        <button onClick={() => { if (confirm("End interview and get report?")) doEnd(); }}
          disabled={ending}
          className="px-4 py-2 text-sm font-semibold rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
          {ending ? "Generating report…" : "End & Get Report"}
        </button>
      </div>

      {/* History */}
      {history.map((item, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-start gap-3 p-4">
            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={difficultyBadge(item.difficulty)}>{item.difficulty}</span>
              </div>
              <p className="text-sm font-medium text-gray-800 mb-2">{item.question}</p>
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 border-l-2 border-gray-300 leading-relaxed">
                {item.answer}
              </p>
            </div>
            <div className={`shrink-0 text-sm font-bold px-3 py-1 rounded-full ${scoreColor(item.score)}`}>
              {item.score}/10
            </div>
          </div>
          <button onClick={() => setExpanded(expanded === i ? null : i)}
            className="w-full px-4 py-2.5 border-t border-gray-100 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1">
            {expanded === i ? "Hide" : "Show"} Feedback & Improved Answer
            <svg className={`w-3.5 h-3.5 transition-transform ${expanded === i ? "rotate-180" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          {expanded === i && (
            <div className="px-4 pb-4 space-y-3 bg-gray-50">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-3 mb-1">Feedback</p>
                <p className="text-sm text-gray-700 leading-relaxed">{item.feedback}</p>
              </div>
              {item.improvedAnswer && (
                <div>
                  <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">💡 Improved Answer</p>
                  <p className="text-sm text-gray-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3 leading-relaxed">
                    {item.improvedAnswer}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Current question */}
      <div className="bg-white rounded-2xl border-2 border-indigo-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className={difficultyBadge(difficulty)}>{difficulty}</span>
          <span className="text-xs text-gray-400">Question {history.length + 1}</span>
        </div>
        <p className="text-base font-semibold text-gray-900 mb-4 leading-relaxed">{question}</p>
        <textarea
          ref={textareaRef}
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit(); }}
          rows={4}
          placeholder="Type your answer here… (Ctrl+Enter to submit)"
          className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
          disabled={loading}
        />
        {error && (
          <div className="mt-2 space-y-2">
            <p className="text-xs text-red-600">{error}</p>
            {error.includes("expired") && (
              <button
                onClick={() => { setPhase("select"); setHistory([]); setSessionId(""); setError(""); }}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline">
                Start a new interview →
              </button>
            )}
          </div>
        )}
        <button onClick={handleSubmit} disabled={!answer.trim() || loading || error.includes("expired")}
          className="mt-3 w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
          {loading ? "Evaluating…" : "Submit Answer →"}
        </button>
      </div>
    </div>
  );

  // ── Phase: Result ─────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto py-10 px-4 space-y-6">
      {/* Score banner */}
      <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl p-8 text-white text-center">
        <div className="text-5xl mb-2">
          {TECH_STACKS.find(t => t.label === result.techStack)?.icon ?? "💻"}
        </div>
        <h2 className="text-2xl font-bold mb-1">{result.techStack} Evaluation Complete</h2>
        <div className="text-5xl font-extrabold mt-3">{result.overallScore.toFixed(1)}<span className="text-2xl text-purple-200">/10</span></div>
        <div className="inline-block mt-2 px-4 py-1.5 bg-white/20 rounded-full text-sm font-semibold">
          {result.skillLevel}
        </div>
        <p className="mt-3 text-purple-100 text-sm">{result.confidenceLevel}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Strengths */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-xs">✓</span>
            Strengths
          </h3>
          <ul className="space-y-1.5">
            {result.strengths.map((s: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0"/>
                {s}
              </li>
            ))}
            {result.strengths.length === 0 && <li className="text-sm text-gray-400">None identified</li>}
          </ul>
        </div>

        {/* Weaknesses */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center text-red-500 text-xs">↗</span>
            Areas to Improve
          </h3>
          <ul className="space-y-1.5">
            {result.weaknesses.map((w: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0"/>
                {w}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Suggested topics */}
      {result.suggestedTopics?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">📚 Suggested Learning Topics</h3>
          <div className="flex flex-wrap gap-2">
            {result.suggestedTopics.map((t: string, i: number) => (
              <span key={i} className="text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1 rounded-full">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Improvement areas */}
      {result.improvementAreas?.length > 0 && (
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5">
          <h3 className="text-sm font-semibold text-amber-800 mb-3">🎯 Focus Areas</h3>
          <ul className="space-y-1">
            {result.improvementAreas.map((a: string, i: number) => (
              <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                <span className="shrink-0 mt-1">•</span>{a}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={() => { setPhase("select"); setHistory([]); setResult(null); setSelected(""); }}
          className="flex-1 py-3 rounded-xl font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
          Try Another Stack
        </button>
        <button onClick={() => navigate("/", { state: { refreshMetrics: true } })}
          className="flex-1 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all">
          View Dashboard
        </button>
      </div>
    </div>
  );
}
