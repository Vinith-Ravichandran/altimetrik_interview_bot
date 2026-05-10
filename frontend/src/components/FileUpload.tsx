import { useRef, useState } from "react";
import { api } from "../api/client";
import type { AccountDto } from "../types";

interface UploadResult {
  totalExtracted: number;
  totalUnique: number;
  questions: { question: string; category: string }[];
  files: { fileName: string; uploadedAt: string }[];
}

interface Props {
  onResult: (result: UploadResult) => void;
  accounts: AccountDto[];
}

const ACCEPTED = ".pdf,.docx,.doc,.txt";

const FILE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  pdf:  { bg: "bg-red-50",    text: "text-red-500",    label: "PDF"  },
  docx: { bg: "bg-blue-50",   text: "text-blue-500",   label: "DOCX" },
  doc:  { bg: "bg-blue-50",   text: "text-blue-500",   label: "DOC"  },
  txt:  { bg: "bg-gray-50",   text: "text-gray-500",   label: "TXT"  },
};

function getExt(name: string) { return name.split(".").pop()?.toLowerCase() ?? ""; }
function fmt(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileUpload({ onResult, accounts }: Props) {
  const [files,       setFiles]       = useState<File[]>([]);
  const [account,     setAccount]     = useState("");
  const [dragging,    setDragging]    = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [progress,    setProgress]    = useState(0);
  const [error,       setError]       = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    setFiles(prev => {
      const next = [...prev];
      Array.from(incoming).forEach(f => {
        if (!next.find(e => e.name === f.name && e.size === f.size)) next.push(f);
      });
      return next;
    });
  }

  function removeFile(i: number) { setFiles(f => f.filter((_, idx) => idx !== i)); }

  async function handleUpload() {
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    setProgress(0);

    // Animate progress bar during upload
    const interval = setInterval(() => {
      setProgress(p => (p < 85 ? p + Math.random() * 12 : p));
    }, 400);

    try {
      const result = await api.uploadForProcessing(files, account || undefined);
      setProgress(100);
      setTimeout(() => {
        onResult(result);
        setFiles([]);
        setProgress(0);
      }, 600);
    } catch (err: any) {
      setError(err?.response?.data?.details ?? err?.response?.data?.message ?? "Upload failed. Please try again.");
    } finally {
      clearInterval(interval);
      setUploading(false);
    }
  }

  return (
    <div className="space-y-5">

      {/* ── Step 1: Account selector ── */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
          Step 1 — Select Account <span className="text-gray-400 font-normal normal-case">(optional)</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setAccount("")}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all
              ${!account
                ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm"
                : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"}`}
          >
            <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-xs flex items-center justify-center font-bold">G</span>
            General
          </button>
          {accounts.map(a => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAccount(a.name)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all
                ${account === a.name
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm"
                  : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"}`}
            >
              {a.logoUrl ? (
                <img src={a.logoUrl} alt={a.name} className="w-6 h-6 object-contain rounded"
                  onError={e => (e.currentTarget.style.display = "none")} />
              ) : (
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs flex items-center justify-center font-bold shrink-0">
                  {a.name.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="truncate">{a.name}</span>
              {account === a.name && (
                <svg className="w-3.5 h-3.5 text-indigo-500 shrink-0 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Step 2: Drop zone ── */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
          Step 2 — Upload Files
        </label>

        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
          className={`relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-200 select-none
            ${dragging
              ? "ring-2 ring-indigo-500 ring-offset-2"
              : "hover:ring-2 hover:ring-indigo-300 hover:ring-offset-1"}`}
        >
          {/* Gradient background */}
          <div className={`absolute inset-0 transition-opacity duration-200
            ${dragging
              ? "bg-gradient-to-br from-indigo-100 via-purple-50 to-blue-100 opacity-100"
              : "bg-gradient-to-br from-slate-50 via-gray-50 to-indigo-50 opacity-100"}`}
          />

          <div className="relative px-8 py-12 text-center">
            {/* Animated icon */}
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-5 transition-all duration-200
              ${dragging
                ? "bg-indigo-500 shadow-lg shadow-indigo-200 scale-110"
                : "bg-white shadow-md border border-gray-100"}`}
            >
              {dragging ? (
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                </svg>
              ) : (
                <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                </svg>
              )}
            </div>

            <p className={`text-lg font-semibold mb-1 transition-colors ${dragging ? "text-indigo-700" : "text-gray-700"}`}>
              {dragging ? "Release to add files" : "Drag & drop your files here"}
            </p>
            <p className="text-sm text-gray-400 mb-4">or click anywhere to browse</p>

            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-200 shadow-sm">
              {["PDF", "DOCX", "DOC", "TXT"].map(t => (
                <span key={t} className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{t}</span>
              ))}
            </div>
          </div>

          <input ref={inputRef} type="file" multiple accept={ACCEPTED} className="hidden"
            onChange={e => addFiles(e.target.files)} />
        </div>
      </div>

      {/* ── File list ── */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
            {files.length} file{files.length > 1 ? "s" : ""} selected
          </p>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {files.map((file, i) => {
              const ext = getExt(file.name);
              const col = FILE_COLORS[ext] ?? FILE_COLORS.txt;
              return (
                <div key={i} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm group">
                  <div className={`w-9 h-9 rounded-lg ${col.bg} flex items-center justify-center shrink-0`}>
                    <span className={`text-[10px] font-bold ${col.text}`}>{col.label}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                    <p className="text-xs text-gray-400">{fmt(file.size)}</p>
                  </div>
                  <button onClick={() => removeFile(i)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400 shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Progress bar ── */}
      {uploading && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Extracting &amp; categorizing questions…</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          {error}
        </div>
      )}

      {/* ── Upload button ── */}
      <button
        onClick={handleUpload}
        disabled={files.length === 0 || uploading}
        className={`w-full py-3.5 px-6 rounded-xl font-semibold text-sm transition-all duration-200
          ${files.length > 0 && !uploading
            ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-200 hover:shadow-xl hover:-translate-y-0.5"
            : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
      >
        {uploading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Processing…
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
            </svg>
            {files.length > 0
              ? `Extract Questions from ${files.length} file${files.length > 1 ? "s" : ""}${account ? ` · ${account}` : ""}`
              : "Select files to get started"}
          </span>
        )}
      </button>
    </div>
  );
}
