interface Props {
  score: number;
  skillLevel: string;
}

const LEVEL_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  Beginner:     { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200" },
  Intermediate: { bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200"  },
  Advanced:     { bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200" },
};

function scoreColor(score: number): string {
  if (score >= 8) return "text-green-600";
  if (score >= 6) return "text-blue-600";
  if (score >= 4) return "text-amber-600";
  return "text-red-500";
}

function scoreRingColor(score: number): string {
  if (score >= 8) return "#22c55e";
  if (score >= 6) return "#3b82f6";
  if (score >= 4) return "#f59e0b";
  return "#ef4444";
}

function ScoreRing({ score }: { score: number }) {
  const pct   = score / 10;
  const r     = 54;
  const circ  = 2 * Math.PI * r;
  const dash  = pct * circ;
  const color = scoreRingColor(score);

  return (
    <svg width="140" height="140" className="rotate-[-90deg]">
      <circle cx="70" cy="70" r={r} fill="none" stroke="#f1f5f9" strokeWidth="10" />
      <circle
        cx="70" cy="70" r={r} fill="none"
        stroke={color} strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
    </svg>
  );
}

export default function ScoreCard({ score, skillLevel }: Props) {
  const levelStyle = LEVEL_STYLE[skillLevel] ?? LEVEL_STYLE.Intermediate;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex flex-col items-center gap-4">
      {/* Ring + score */}
      <div className="relative">
        <ScoreRing score={score} />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-4xl font-bold tracking-tight ${scoreColor(score)}`}>
            {score.toFixed(1)}
          </span>
          <span className="text-xs text-gray-400 mt-0.5">out of 10</span>
        </div>
      </div>

      {/* Label + skill level */}
      <div className="text-center space-y-2">
        <p className="text-base font-semibold text-gray-800">Overall Score</p>
        <span className={`inline-block text-sm font-medium px-4 py-1.5 rounded-full border ${levelStyle.bg} ${levelStyle.text} ${levelStyle.border}`}>
          {skillLevel}
        </span>
      </div>
    </div>
  );
}
