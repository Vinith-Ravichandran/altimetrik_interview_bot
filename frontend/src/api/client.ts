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
