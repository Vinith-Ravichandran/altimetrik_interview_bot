interface Question {
  question: string;
  category: string;
}

interface Props {
  questions: Question[];
  totalUnique: number;
  onRefresh?: () => void;
  refreshing?: boolean;
}

const CATEGORY_ORDER = ["SQL", "Python", "Java", "BigQuery", "GCS", "Others"];

const CATEGORY_COLORS: Record<string, string> = {
  SQL:      "bg-blue-50 border-blue-200 text-blue-800",
  Python:   "bg-yellow-50 border-yellow-200 text-yellow-800",
  Java:     "bg-orange-50 border-orange-200 text-orange-800",
  BigQuery: "bg-purple-50 border-purple-200 text-purple-800",
  GCS:      "bg-teal-50 border-teal-200 text-teal-800",
  Others:   "bg-gray-50 border-gray-200 text-gray-700",
};

const CATEGORY_DOT: Record<string, string> = {
  SQL:      "bg-blue-500",
  Python:   "bg-yellow-500",
  Java:     "bg-orange-500",
  BigQuery: "bg-purple-500",
  GCS:      "bg-teal-500",
  Others:   "bg-gray-400",
};

export default function QuestionList({ questions, totalUnique, onRefresh, refreshing }: Props) {
  // Group questions by category
  const grouped: Record<string, string[]> = {};
  for (const q of questions) {
    const cat = CATEGORY_ORDER.includes(q.category) ? q.category : "Others";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(q.question);
  }

  const presentCategories = CATEGORY_ORDER.filter(c => (grouped[c]?.length ?? 0) > 0);

  return (
    <div className="mt-6 space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Extracted Questions</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            <span className="font-medium text-gray-800">{totalUnique}</span> unique questions across{" "}
            {presentCategories.length} categor{presentCategories.length === 1 ? "y" : "ies"}
          </p>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg
              border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        )}
      </div>

      {/* Category pills summary */}
      <div className="flex flex-wrap gap-2">
        {presentCategories.map(cat => (
          <span
            key={cat}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.Others}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${CATEGORY_DOT[cat] ?? CATEGORY_DOT.Others}`} />
            {cat} · {grouped[cat].length}
          </span>
        ))}
      </div>

      {/* Scrollable question list */}
      <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
        {presentCategories.map(cat => (
          <div key={cat}>
            {/* Category header */}
            <div className={`sticky top-0 z-10 px-5 py-2.5 flex items-center gap-2 border-b border-gray-100
              ${CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.Others} bg-opacity-80 backdrop-blur-sm`}>
              <span className={`w-2 h-2 rounded-full ${CATEGORY_DOT[cat] ?? CATEGORY_DOT.Others}`} />
              <span className="font-semibold text-sm">{cat}</span>
              <span className="ml-auto text-xs opacity-70">{grouped[cat].length} question{grouped[cat].length !== 1 ? "s" : ""}</span>
            </div>

            {/* Questions */}
            <ul className="divide-y divide-gray-50">
              {grouped[cat].map((q, i) => (
                <li key={i} className="px-5 py-3 flex gap-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  <span className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-gray-100
                    text-gray-500 text-xs font-medium mt-0.5">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{q}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
