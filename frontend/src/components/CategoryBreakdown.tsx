interface Category {
  category: string;
  score: number;
  level?: string;
}

interface Props {
  categories: Category[];
}

function barColor(score: number): string {
  if (score >= 8) return "bg-green-500";
  if (score >= 6) return "bg-blue-500";
  if (score >= 4) return "bg-amber-500";
  return "bg-red-400";
}

function scoreLabel(score: number): string {
  if (score >= 8) return "text-green-700";
  if (score >= 6) return "text-blue-700";
  if (score >= 4) return "text-amber-700";
  return "text-red-600";
}

export default function CategoryBreakdown({ categories }: Props) {
  if (categories.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-5">Category Breakdown</h3>

      <div className="space-y-4">
        {categories.map((c, i) => (
          <div key={i}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-gray-700">{c.category}</span>
              <div className="flex items-center gap-2">
                {c.level && (
                  <span className="text-xs text-gray-400">{c.level}</span>
                )}
                <span className={`text-sm font-bold ${scoreLabel(c.score)}`}>
                  {c.score}/10
                </span>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${barColor(c.score)}`}
                style={{ width: `${(c.score / 10) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
