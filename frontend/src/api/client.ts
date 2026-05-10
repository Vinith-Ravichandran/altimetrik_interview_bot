import axios from "axios";
import type {
  AccountDto,
  AccountWithRolesRequest,
  AnswerDto,
  DocumentDto,
  InterviewSessionDto,
  LoginRequest,
  QuestionDto,
  RealInterviewLogDto,
  RegisterRequest,
  RoleDto,
  TokenResponse,
  UserDto,
} from "../types";

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

export const http = axios.create({
  baseURL: `${baseURL}/api/v1`,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT from localStorage on every request
http.interceptors.request.use(config => {
  const token = localStorage.getItem("auth.token");
  if (token) config.headers["Authorization"] = `Bearer ${token}`;
  return config;
});

// Redirect to login on 401
http.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem("auth.token");
      localStorage.removeItem("auth.user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// kept for backward compat — no longer sets X-Admin-Key
export function setAdminMode(_isAdmin: boolean) {}

export const api = {
  // ── Auth ─────────────────────────────────────────────────────────────────
  login: (data: LoginRequest) =>
    http.post<TokenResponse>("/auth/login", data).then(r => r.data),
  register: (data: RegisterRequest) =>
    http.post<TokenResponse>("/auth/register", data).then(r => r.data),

  // ── Users ─────────────────────────────────────────────────────────────────
  me: () => http.get<UserDto>("/users/me").then(r => r.data),
  listUsers: () => http.get<UserDto[]>("/users").then(r => r.data),
  promoteUser: (id: string) => http.patch<UserDto>(`/users/${id}/promote`).then(r => r.data),
  deactivateUser: (id: string) => http.patch<UserDto>(`/users/${id}/deactivate`).then(r => r.data),
  activateUser: (id: string) => http.patch<UserDto>(`/users/${id}/activate`).then(r => r.data),
  deleteUser: (id: string) => http.delete(`/users/${id}`),

  // ── Documents ─────────────────────────────────────────────────────────────
  listDocuments: () => http.get<DocumentDto[]>("/documents").then(r => r.data),
  uploadDocument: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return http.post<DocumentDto>("/documents", fd, { headers: { "Content-Type": "multipart/form-data" } }).then(r => r.data);
  },
  deleteDocument: (id: string) => http.delete(`/documents/${id}`),
  exportUrl: (id: string, format: "pdf" | "docx") => `${baseURL}/api/v1/documents/${id}/export?format=${format}`,
  uploadForProcessing: (files: File[], accountName?: string) => {
    const fd = new FormData();
    files.forEach(f => fd.append("files", f));
    if (accountName) fd.append("accountName", accountName);
    return http.post<{
      totalExtracted: number;
      totalUnique: number;
      questions: { question: string; category: string }[];
      files: { fileName: string; uploadedAt: string }[];
    }>("/process/upload", fd, { headers: { "Content-Type": "multipart/form-data" } })
      .then(r => r.data);
  },
  getQuestions: () =>
    http.get<{
      totalExtracted: number;
      totalUnique: number;
      questions: { question: string; category: string }[];
    }>("/process/questions").then(r => r.data),
  getFiles: () =>
    http.get<{ fileName: string; uploadedAt: string }[]>("/process/files").then(r => r.data),
  masterPdfUrl: () => `${baseURL}/api/v1/process/download`,

  // ── Bot interview history ──────────────────────────────────────────────────
  getBotInterviewHistory: () =>
    http.get<{
      sessionId: string; company: string; role: string; mode: string;
      techStack: string | null; status: string;
      overallScore: number | null; skillLevel: string | null;
      overallFeedback: string | null; createdAt: string; completedAt: string | null;
      answers: {
        question: string; answer: string; score: number;
        clarityScore: number | null; depthScore: number | null; qualityScore: number | null;
        feedback: string; improvedAnswer: string | null; followup: boolean;
      }[];
    }[]>("/bot/interview/history").then(r => r.data),

  // ── Mode 1: DB Questions interview ───────────────────────────────────────
  startBotInterview: (company: string, role: string) =>
    http.post<{
      sessionId: string;
      firstQuestion: { id: string; content: string; category: string; role: string; company: string };
    }>("/bot/interview/start", { company, role }).then(r => r.data),
  submitBotAnswer: (sessionId: string, answer: string) =>
    http.post<{
      sessionId: string; nextQuestion: string | null; isComplete: boolean;
      clarity: number;  clarityJustification: string;
      depth: number;    depthJustification: string;
      quality: number;  qualityJustification: string;
      overall: number;  feedback: string; improvedAnswer: string;
    }>("/bot/interview/answer", { sessionId, answer }).then(r => r.data),
  endBotInterview: (sessionId: string) =>
    http.post<{
      sessionId: string; overallScore: number; skillLevel: string;
      strengths: string[]; weaknesses: string[];
      categoryAnalysis: { category: string; score: number; level: string }[];
    }>("/bot/interview/end", { sessionId }).then(r => r.data),

  // ── Mode 2: Tech Stack evaluation ─────────────────────────────────────────
  startTechStack: (techStack: string) =>
    http.post<{ sessionId: string; techStack: string; firstQuestion: string; difficulty: string }>(
      "/bot/tech-stack/start", { techStack }).then(r => r.data),
  submitTechAnswer: (sessionId: string, answer: string) =>
    http.post<{
      sessionId: string; nextQuestion: string | null; difficulty: string | null;
      isComplete: boolean; score: number; feedback: string; improvedAnswer: string;
    }>("/bot/tech-stack/answer", { sessionId, answer }).then(r => r.data),
  endTechStack: (sessionId: string) =>
    http.post<{
      sessionId: string; techStack: string; overallScore: number; skillLevel: string;
      strengths: string[]; weaknesses: string[]; improvementAreas: string[];
      suggestedTopics: string[]; confidenceLevel: string;
    }>("/bot/tech-stack/end", { sessionId }).then(r => r.data),

  // ── User metrics ──────────────────────────────────────────────────────────
  getUserMetrics: () =>
    http.get<{
      totalInterviews: number;
      dbQuestionsCompleted: number;
      confidentAnswers: number;
      needsImprovement: number;
      overallAvgScore: number;
      avgClarity: number;
      avgDepth: number;
      avgQuality: number;
      bestTechStack: string;
      bestTechScore: number;
      weakestArea: string;
      weakestScore: number;
      techStrengths: { tech: string; avgScore: number; questionsAnswered: number; level: string }[];
      accountStats:  { account: string; totalInterviews: number; avgScore: number; level: string }[];
      scoreTrend:    { date: string; score: number; label: string }[];
      recentInterviews: {
        sessionId: string; type: string; label: string;
        company: string; score: number; skillLevel: string; completedAt: string;
      }[];
      strongAreas: string[];
      weakAreas: string[];
    }>("/bot/metrics").then(r => r.data),

  // ── Accounts ──────────────────────────────────────────────────────────────
  listAccounts: () => http.get<AccountDto[]>("/accounts").then(r => r.data),
  deleteAccount: (id: string) => http.delete(`/accounts/${id}`),

  // ── Roles ─────────────────────────────────────────────────────────────────
  listRoles: (accountId?: string) => {
    const params = accountId ? { accountId } : {};
    return http.get<RoleDto[]>("/roles", { params }).then(r => r.data);
  },
  deleteRole: (id: string) => http.delete(`/roles/${id}`),

  // ── Admin ─────────────────────────────────────────────────────────────────
  createAccountWithRoles: (data: AccountWithRolesRequest) =>
    http.post<AccountDto>("/admin/accounts-with-roles", data).then(r => r.data),
  updateAccount: (id: string, data: { name?: string; logoUrl?: string }) =>
    http.patch<AccountDto>(`/accounts/${id}`, data).then(r => r.data),
  addRoleToAccount: (accountId: string, roleName: string) =>
    http.post<AccountDto>(`/accounts/${accountId}/roles`, { name: roleName }).then(r => r.data),

  // ── Role-based Dashboards ─────────────────────────────────────────────────
  getUserDashboard: () =>
    http.get<{
      totalSessions: number; completedSessions: number;
      avgScore: number; bestScore: number; skillLevel: string;
      latestScore: number | null; latestFeedback: string | null;
      lastActivity: string | null;
    }>("/dashboard/user").then(r => r.data),

  getAdminDashboard: () =>
    http.get<{
      totalUsers: number; totalSessions: number; completedSessions: number; avgScore: number;
      allUsers: { userId: string; name: string; roleName: string | null; accountName: string | null;
                  totalSessions: number; completedSessions: number; avgScore: number; bestScore: number; lastActivity: string | null }[];
      topPerformers: { userId: string; name: string; roleName: string | null; accountName: string | null;
                       totalSessions: number; completedSessions: number; avgScore: number; bestScore: number; lastActivity: string | null }[];
      recentActivity: { userName: string; accountName: string; roleName: string; score: number; completedAt: string }[];
    }>("/dashboard/admin").then(r => r.data),

  // ── Admin — per-user analytics panel ─────────────────────────────────────
  getUserAnalytics: (userId: string) =>
    http.get<{
      userId: string; name: string; email: string | null;
      roleName: string | null; accountName: string | null;
      admin: boolean; active: boolean; memberSince: string;
      totalSessions: number; completedSessions: number;
      totalAnswers: number; confidentAnswers: number; needsImprovement: number;
      overallAvgScore: number; avgClarity: number; avgDepth: number; avgQuality: number;
      bestTech: string; bestTechScore: number; weakestTech: string;
      techBreakdown:    { tech: string; avgScore: number; count: number; level: string }[];
      accountBreakdown: { account: string; count: number; avgScore: number; level: string }[];
      scoreTrend:       { date: string; score: number; label: string }[];
      recentSessions: {
        sessionId: string; mode: string; label: string; company: string;
        score: number; skillLevel: string;
        startedAt: string; completedAt: string; durationMinutes: number;
        avgClarity: number; avgDepth: number; avgQuality: number;
        totalQuestions: number; answeredQuestions: number; followUpCount: number;
      }[];
      strongAreas: string[]; weakAreas: string[];
    }>(`/admin/dashboard/user/${userId}/analytics`).then(r => r.data),

  // ── Legacy admin dashboard (kept for compatibility) ───────────────────────
  getAdminSummary: () =>
    http.get<{
      totalUsers: number; totalMocks: number; completedMocks: number;
      avgScore: number; topRole: string; topRoleScore: number;
    }>("/admin/dashboard/summary").then(r => r.data),
  getUsersPerformance: () =>
    http.get<{
      userId: string; name: string; roleName: string | null; accountName: string | null;
      mockCount: number; avgScore: number; highestScore: number;
      realInterviews: number; lastActivity: string | null;
    }[]>("/admin/dashboard/users/performance").then(r => r.data),

  // ── Interviews ────────────────────────────────────────────────────────────
  startInterview: (accountId: string, roleId: string) =>
    http.post<InterviewSessionDto>("/interviews", { accountId, roleId }).then(r => r.data),
  getInterview: (id: string) => http.get<InterviewSessionDto>(`/interviews/${id}`).then(r => r.data),
  listInterviews: () => http.get<InterviewSessionDto[]>("/interviews").then(r => r.data),
  nextQuestion: (sessionId: string) => http.post<QuestionDto>(`/interviews/${sessionId}/next-question`).then(r => r.data),
  submitAnswer: (questionId: string, text: string) =>
    http.post<AnswerDto>(`/interviews/questions/${questionId}/answer`, { text }).then(r => r.data),
  finishInterview: (id: string) => http.post<InterviewSessionDto>(`/interviews/${id}/finish`).then(r => r.data),

  // ── Real Interviews ───────────────────────────────────────────────────────
  listRealInterviews: () => http.get<RealInterviewLogDto[]>("/real-interviews").then(r => r.data),
  logRealInterview: (accountId: string, panelistName: string, questions: string[]) =>
    http.post<RealInterviewLogDto>("/real-interviews", { accountId, panelistName, questions }).then(r => r.data),
};
