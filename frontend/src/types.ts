export interface DocumentDto {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface RoleDto {
  id: string;
  name: string;
  accountId: string | null;
}

export interface AccountDto {
  id: string;
  name: string;
  logoUrl?: string | null;
  roles: RoleDto[];
}

export interface AccountWithRolesRequest {
  accountName: string;
  logoUrl?: string;
  roles: string[];
}

export interface EvaluationDto {
  clarity: number;
  depth: number;
  quality: number;
  overall: number;
  strengths: string;
  improvements: string;
}

export interface AnswerDto {
  id: string;
  text: string;
  evaluation?: EvaluationDto | null;
}

export interface QuestionDto {
  id: string;
  orderIndex: number;
  text: string;
  answer?: AnswerDto | null;
}

export interface InterviewSessionDto {
  id: string;
  accountId: string;
  accountName: string;
  roleId: string;
  roleName: string;
  startedAt: string;
  completedAt?: string | null;
  overallScore?: number | null;
  overallFeedback?: string | null;
  questions: QuestionDto[];
}

export interface RealInterviewQuestionDto {
  id: string;
  text: string;
  domain: string;
  service: string;
  difficulty: string;
}

export interface RealInterviewLogDto {
  id: string;
  accountId: string;
  accountName: string;
  panelistName: string;
  loggedAt: string;
  questions: RealInterviewQuestionDto[];
}

// Auth types
export interface UserDto {
  id: string;
  name: string;
  email: string | null;
  roleName: string | null;
  accountName: string | null;
  admin: boolean;
  active: boolean;
  mockCount: number;
  createdAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface TokenResponse {
  token: string;
  userId: string;
  name: string;
  email: string | null;
  roleName: string | null;
  admin: boolean;
}
