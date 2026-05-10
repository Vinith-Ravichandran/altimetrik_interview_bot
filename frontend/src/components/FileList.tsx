interface UploadedFile {
  fileName: string;
  uploadedAt: string;
}

interface Props {
  files: UploadedFile[];
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function fileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  const colors: Record<string, string> = {
    pdf:  "text-red-500",
    docx: "text-blue-500",
    doc:  "text-blue-500",
    txt:  "text-gray-400",
  };
  return colors[ext ?? ""] ?? "text-gray-400";
}

export default function FileList({ files }: Props) {
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-900">Uploaded Files</h2>
        <span className="text-sm text-gray-400">
          {files.length} {files.length === 1 ? "file" : "files"}
        </span>
      </div>

      {files.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-6 py-8 text-center text-sm text-gray-400">
          No files uploaded yet
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 max-h-64 overflow-y-auto">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
              <svg className={`w-5 h-5 shrink-0 ${fileIcon(f.fileName)}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd"
                  d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                  clipRule="evenodd" />
              </svg>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800 truncate">{f.fileName}</p>
                <p className="text-xs text-gray-400 mt-0.5">{formatDate(f.uploadedAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
