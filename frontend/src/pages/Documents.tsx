import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { AccountDto } from "../types";
import FileUpload from "../components/FileUpload";
import FileList from "../components/FileList";
import QuestionList from "../components/QuestionList";

interface Question     { question: string; category: string; }
interface UploadedFile { fileName: string; uploadedAt: string; }
interface LastStats    { totalExtracted: number; totalUnique: number; }

export default function Documents() {
  const [accounts,      setAccounts]      = useState<AccountDto[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [questions,     setQuestions]     = useState<Question[]>([]);
  const [lastStats,     setLastStats]     = useState<LastStats | null>(null);
  const [refreshing,    setRefreshing]    = useState(false);
  const [successBanner, setSuccessBanner] = useState(false);

  useEffect(() => {
    api.listAccounts().then(setAccounts).catch(() => {});
    api.getFiles().then(setUploadedFiles).catch(() => {});
    api.getQuestions().then(d => setQuestions(d.questions ?? [])).catch(() => {});
  }, []);

  function handleUploadResult(result: {
    totalExtracted: number; totalUnique: number;
    questions: Question[]; files: UploadedFile[];
  }) {
    setUploadedFiles(result.files);
    setQuestions(result.questions);
    setLastStats({ totalExtracted: result.totalExtracted, totalUnique: result.totalUnique });
    setSuccessBanner(true);
    setTimeout(() => setSuccessBanner(false), 6000);
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const [qData, fData] = await Promise.all([api.getQuestions(), api.getFiles()]);
      setQuestions(qData.questions ?? []);
      setUploadedFiles(fData);
    } catch { /* silent */ }
    finally { setRefreshing(false); }
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-4xl mx-auto py-10 px-4 space-y-8">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Document Processing</h1>
            <p className="mt-1.5 text-gray-500">
              Upload interview materials to extract, categorize, and store questions for mock interviews.
            </p>
          </div>
          <a href={api.masterPdfUrl()} download="master_questions.pdf"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-all shadow-sm shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            Download PDF
          </a>
        </div>

        {/* ── Stats strip ── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Files Uploaded",       value: uploadedFiles.length, color: "text-indigo-600", bg: "bg-indigo-50" },
            { label: "Questions Extracted",  value: questions.length,     color: "text-purple-600", bg: "bg-purple-50" },
            { label: "Accounts Available",   value: accounts.length,      color: "text-blue-600",   bg: "bg-blue-50"   },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl px-5 py-4 text-center`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Upload card ── */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Upload Interview Materials</h2>
              <p className="text-xs text-gray-400">PDF, DOCX, TXT — multiple files at once</p>
            </div>
          </div>
          <FileUpload onResult={handleUploadResult} accounts={accounts} />
        </div>

        {/* ── Success banner ── */}
        {successBanner && lastStats && (
          <div className="rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 px-6 py-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-green-800">Processing Complete!</p>
              <p className="text-green-700 text-sm mt-0.5">
                <span className="font-bold">{lastStats.totalExtracted}</span> questions extracted —{" "}
                <span className="font-bold">{lastStats.totalUnique}</span> unique questions saved
                {lastStats.totalExtracted > lastStats.totalUnique && (
                  <span className="text-green-600 ml-1">
                    ({lastStats.totalExtracted - lastStats.totalUnique} duplicates removed)
                  </span>
                )}
              </p>
              <p className="text-xs text-green-600 mt-1">
                Questions are now available for mock interviews and stored in PostgreSQL.
              </p>
            </div>
            <button onClick={() => setSuccessBanner(false)} className="text-green-400 hover:text-green-600 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        )}

        {/* ── Uploaded files ── */}
        <FileList files={uploadedFiles} />

        {/* ── Extracted questions ── */}
        {questions.length > 0 && (
          <QuestionList
            questions={questions}
            totalUnique={questions.length}
            onRefresh={handleRefresh}
            refreshing={refreshing}
          />
        )}

        {questions.length === 0 && uploadedFiles.length > 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            No questions extracted yet — upload documents above to begin.
          </div>
        )}
      </div>
    </div>
  );
}
