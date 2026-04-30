package com.interviewprep.dto;

import com.interviewprep.domain.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class Dtos {
    private Dtos() {}

    // ─── Document ────────────────────────────────────────────────────────────

    public record DocumentDto(
            UUID id, String filename, String contentType, long sizeBytes,
            String accountName, String roleName, String category, String tags,
            Instant uploadedAt) {
        public static DocumentDto of(Document d) {
            return new DocumentDto(
                    d.getId(), d.getFilename(), d.getContentType(), d.getSizeBytes(),
                    d.getAccountName(), d.getRoleName(), d.getCategory(), d.getTags(),
                    d.getUploadedAt());
        }
    }

    // ─── Role ────────────────────────────────────────────────────────────────

    public record RoleDto(UUID id, String name, UUID accountId) {
        public static RoleDto of(Role r) {
            return new RoleDto(r.getId(), r.getName(), r.getAccount() != null ? r.getAccount().getId() : null);
        }
    }

    // ─── Account ─────────────────────────────────────────────────────────────

    public record AccountDto(UUID id, String name, String logoUrl, List<RoleDto> roles) {
        public static AccountDto of(Account a) {
            return new AccountDto(a.getId(), a.getName(), a.getLogoUrl(),
                    a.getRoles().stream().map(RoleDto::of).toList());
        }
    }

    public record AccountRequest(String name, String logoUrl) {}
    public record AccountWithRolesRequest(String accountName, String logoUrl, List<String> roles) {}

    // ─── User ─────────────────────────────────────────────────────────────────

    public record UserDto(
            UUID id, String name, String email, String roleName, String accountName,
            boolean admin, boolean active, int mockCount, Instant createdAt) {
        public static UserDto of(AppUser u) {
            return new UserDto(u.getId(), u.getName(), u.getEmail(), u.getRoleName(),
                    u.getAccountName(), u.isAdmin(), u.isActive(), u.getMockCount(), u.getCreatedAt());
        }
    }

    public record CreateUserRequest(
            String name, String password, String roleName,
            String accountName, boolean admin) {}

    public record UpdateUserRequest(String roleName, String accountName) {}

    public record RegisterRequest(String name, String email, String password) {}

    public record LoginRequest(String email, String password) {}

    public record TokenResponse(
            String token, UUID userId,
            String name, String email, String roleName, boolean admin) {}

    // ─── Interview ────────────────────────────────────────────────────────────

    public record StartInterviewRequest(UUID accountId, UUID roleId, UUID userId) {}

    public record QuestionDto(UUID id, int orderIndex, String text, AnswerDto answer) {
        public static QuestionDto of(Question q) {
            return new QuestionDto(q.getId(), q.getOrderIndex(), q.getText(),
                    q.getAnswer() == null ? null : AnswerDto.of(q.getAnswer()));
        }
    }

    public record AnswerDto(UUID id, String text, EvaluationDto evaluation) {
        public static AnswerDto of(Answer a) {
            return new AnswerDto(a.getId(), a.getText(),
                    a.getEvaluation() == null ? null : EvaluationDto.of(a.getEvaluation()));
        }
    }

    public record EvaluationDto(double clarity, double depth, double quality, double overall,
                                String strengths, String improvements) {
        public static EvaluationDto of(Evaluation e) {
            return new EvaluationDto(e.getClarity(), e.getDepth(), e.getQuality(), e.getOverall(),
                    e.getStrengths(), e.getImprovements());
        }
    }

    public record InterviewSessionDto(
            UUID id, UUID accountId, String accountName,
            UUID roleId, String roleName,
            UUID userId,
            Instant startedAt, Instant completedAt,
            Double overallScore, String overallFeedback,
            List<QuestionDto> questions) {
        public static InterviewSessionDto of(InterviewSession s) {
            return new InterviewSessionDto(
                    s.getId(),
                    s.getAccount() == null ? null : s.getAccount().getId(),
                    s.getAccount() == null ? null : s.getAccount().getName(),
                    s.getRole() == null ? null : s.getRole().getId(),
                    s.getRole() == null ? null : s.getRole().getName(),
                    s.getUser() == null ? null : s.getUser().getId(),
                    s.getStartedAt(), s.getCompletedAt(),
                    s.getOverallScore(), s.getOverallFeedback(),
                    s.getQuestions().stream().map(QuestionDto::of).toList());
        }
    }

    public record SubmitAnswerRequest(String text) {}

    // ─── Real Interview ───────────────────────────────────────────────────────

    public record RealInterviewRequest(UUID accountId, String panelistName, List<String> questions) {}

    public record RealInterviewQuestionDto(UUID id, String text, String domain, String service, String difficulty) {
        public static RealInterviewQuestionDto of(RealInterviewQuestion q) {
            return new RealInterviewQuestionDto(q.getId(), q.getText(), q.getDomain(), q.getService(), q.getDifficulty());
        }
    }

    public record RealInterviewLogDto(UUID id, UUID accountId, String accountName, String panelistName,
                                      Instant loggedAt, List<RealInterviewQuestionDto> questions) {
        public static RealInterviewLogDto of(RealInterviewLog log) {
            return new RealInterviewLogDto(
                    log.getId(),
                    log.getAccount() == null ? null : log.getAccount().getId(),
                    log.getAccount() == null ? null : log.getAccount().getName(),
                    log.getPanelistName(), log.getLoggedAt(),
                    log.getQuestions().stream().map(RealInterviewQuestionDto::of).toList());
        }
    }

    // ─── Chat ─────────────────────────────────────────────────────────────────

    public record ChatRequest(
            UUID sessionId,  // null → start new session
            UUID userId,     // optional
            String message) {}

    public record ChatResponse(
            UUID sessionId,
            String reply,
            String intent,          // VECTOR_SEARCH | GENERAL
            List<String> sources,   // chunk IDs or document names used as context
            Instant timestamp) {}

    public record ChatMessageDto(UUID id, String role, String content, String intent, Instant createdAt) {
        public static ChatMessageDto of(ChatMessage m) {
            return new ChatMessageDto(m.getId(), m.getRole().name(), m.getContent(), m.getIntent(), m.getCreatedAt());
        }
    }

    // ─── Dashboard ────────────────────────────────────────────────────────────

    public record DashboardSummaryDto(
            long totalUsers, long totalMocks, long completedMocks,
            double avgScore, String topRole, double topRoleScore) {}

    public record WeeklyCountDto(String date, long count) {}

    public record UserStatsDto(
            UUID userId, String name, String roleName, String accountName,
            int mockCount, double avgScore, double highestScore,
            long realInterviews, Instant lastActivity) {}
}
