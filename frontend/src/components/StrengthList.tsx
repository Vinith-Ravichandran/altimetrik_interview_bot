interface Props {
  strengths: string[];
}

export default function StrengthList({ strengths }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 h-full">
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-100">
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </span>
        <h3 className="text-sm font-semibold text-gray-900">Strengths</h3>
      </div>

      {strengths.length === 0 ? (
        <p className="text-sm text-gray-400 py-2">No strengths identified yet.</p>
      ) : (
        <ul className="space-y-2.5">
          {strengths.map((s, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
