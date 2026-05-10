package com.interviewprep.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class BotDtos {

    // ── File upload ──────────────────────────────────────────────────────────
    public record UploadResponse(UUID fileId, String fileName, LocalDateTime uploadedAt) {}
    public record ProcessResponse(int questionsExtracted, int questionsDeduplicated, int questionsStored) {}

    // ── Questions ────────────────────────────────────────────────────────────
    public record BotQuestionDto(UUID id, String content, String category,
                                  String company, String role, String difficulty, LocalDateTime createdAt) {}
    public record ExtractedQuestion(String question, String category, String difficulty) {}

    // ── Evaluation (per-answer) — enhanced with detailed scores ──────────────
    public record EvaluationResult(
        int score, String feedback, String nextAction, String nextQuestion) {}

    public record DetailedEvaluationResult(
        double clarity,  String clarityJustification,
        double depth,    String depthJustification,
        double quality,  String qualityJustification,
        double overall,
        String feedback, String improvedAnswer,
        String nextAction, String nextQuestion) {}

    // ── Final evaluation ─────────────────────────────────────────────────────
    public record CategoryScore(String category, int score, String level) {}

    // ── Mode 1: DB Questions interview flow ───────────────────────────────────
    public record InterviewStartRequest(String company, String role) {}
    public record InterviewStartResponse(String sessionId, BotQuestionDto firstQuestion) {}

    public record AnswerRequest(String sessionId, String answer) {}
    public record AnswerResponse(
        String sessionId, String nextQuestion, boolean isComplete,
        double clarity,  String clarityJustification,
        double depth,    String depthJustification,
        double quality,  String qualityJustification,
        double overall,
        String feedback, String improvedAnswer) {}

    public record EndInterviewRequest(String sessionId) {}
    public record EndInterviewResponse(
        String sessionId, double overallScore, String skillLevel,
        List<String> strengths, List<String> weaknesses, List<CategoryScore> categoryAnalysis) {}

    // ── Mode 2: Tech Stack evaluation flow ────────────────────────────────────
    public record TechStackStartRequest(String techStack) {}
    public record TechStackStartResponse(String sessionId, String techStack, String firstQuestion, String difficulty) {}

    public record TechStackAnswerRequest(String sessionId, String answer) {}
    public record TechStackAnswerResponse(
        String sessionId, String nextQuestion, String difficulty,
        boolean isComplete, double score,
        String feedback, String improvedAnswer) {}

    public record TechStackEndRequest(String sessionId) {}
    public record TechStackEndResponse(
        String sessionId, String techStack, double overallScore, String skillLevel,
        List<String> strengths, List<String> weaknesses,
        List<String> improvementAreas, List<String> suggestedTopics,
        String confidenceLevel) {}

    // ── History ──────────────────────────────────────────────────────────────
    public record SessionAnswerDto(
        String question, String answer, Integer score,
        Double clarityScore,  String clarityJustification,
        Double depthScore,    String depthJustification,
        Double qualityScore,  String qualityJustification,
        String feedback, String improvedAnswer, boolean followup) {}

    public record SessionHistoryDto(
        String sessionId, String company, String role,
        String mode, String techStack, String status,
        Double overallScore, String skillLevel, String overallFeedback,
        String createdAt, String completedAt,
        List<SessionAnswerDto> answers) {}

    // ── Dashboard metrics ────────────────────────────────────────────────────
    public record TechStrengthDto(
        String tech, double avgScore, long questionsAnswered, String level) {}

    public record AccountStatsDto(
        String account, long totalInterviews, double avgScore, String level) {}

    public record ScoreTrendDto(String date, double score, String label) {}

    public record RecentInterviewDto(
        String sessionId, String type, String label,
        String company, double score, String skillLevel, String completedAt) {}

    public record UserMetricsDto(
        // Counts
        long totalInterviews,
        long dbQuestionsCompleted,
        long confidentAnswers,
        long needsImprovement,
        // Scores
        double overallAvgScore,
        double avgClarity,
        double avgDepth,
        double avgQuality,
        // Best / Worst
        String bestTechStack,
        double bestTechScore,
        String weakestArea,
        double weakestScore,
        // Breakdowns
        List<TechStrengthDto>    techStrengths,
        List<AccountStatsDto>    accountStats,
        List<ScoreTrendDto>      scoreTrend,
        List<RecentInterviewDto> recentInterviews,
        // Areas
        List<String> strongAreas,
        List<String> weakAreas) {}
}
