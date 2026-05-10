package com.interviewprep.service;

import com.interviewprep.domain.InterviewSessionRecord;
import com.interviewprep.domain.SessionAnswer;
import com.interviewprep.dto.BotDtos;
import com.interviewprep.repository.InterviewSessionRecordRepository;
import com.interviewprep.repository.SessionAnswerRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class UserMetricsService {

    private static final Logger log = LoggerFactory.getLogger(UserMetricsService.class);
    private static final DateTimeFormatter CHART_FMT = DateTimeFormatter.ofPattern("MMM d");

    private final InterviewSessionRecordRepository sessionRepository;
    private final SessionAnswerRepository          answerRepository;

    public UserMetricsService(InterviewSessionRecordRepository sessionRepository,
                               SessionAnswerRepository answerRepository) {
        this.sessionRepository = sessionRepository;
        this.answerRepository  = answerRepository;
    }

    public BotDtos.UserMetricsDto getMetrics(UUID userId) {
        log.info("[METRICS] Computing for userId={}", userId);

        List<InterviewSessionRecord> allSessions =
            sessionRepository.findByUserIdOrderByCreatedAtDesc(userId);

        // Count all sessions (active + completed) so totalInterviews reflects real usage
        List<InterviewSessionRecord> completed = allSessions.stream()
            .filter(s -> "COMPLETED".equals(s.getStatus()))
            .toList();

        // ── All answers across all sessions ──────────────────────────────────
        List<SessionAnswer> allAnswers = allSessions.stream()
            .flatMap(s -> answerRepository.findBySessionIdOrderByCreatedAtAsc(s.getId()).stream())
            .filter(a -> a.getScore() != null)
            .toList();

        // ── DB Questions mode answers ─────────────────────────────────────────
        Set<UUID> dbSessionIds = allSessions.stream()
            .filter(s -> "DB_QUESTIONS".equals(s.getMode()))
            .map(InterviewSessionRecord::getId).collect(Collectors.toSet());

        List<SessionAnswer> dbAnswers = allAnswers.stream()
            .filter(a -> dbSessionIds.contains(a.getSessionId())).toList();

        long dbQuestionsCompleted = dbAnswers.size();
        long confidentAnswers     = dbAnswers.stream().filter(a -> a.getScore() >= 7).count();
        long needsImprovement     = dbAnswers.stream().filter(a -> a.getScore() <  5).count();

        // ── Overall averages — use answered questions when no session-level score ──
        double overallAvgScore = allAnswers.isEmpty() ? 0
            : allAnswers.stream().mapToInt(SessionAnswer::getScore).average().orElse(0);

        double avgClarity = allAnswers.stream()
            .filter(a -> a.getClarityScore() != null)
            .mapToDouble(SessionAnswer::getClarityScore).average().orElse(0);

        double avgDepth = allAnswers.stream()
            .filter(a -> a.getDepthScore() != null)
            .mapToDouble(SessionAnswer::getDepthScore).average().orElse(0);

        double avgQuality = allAnswers.stream()
            .filter(a -> a.getQualityScore() != null)
            .mapToDouble(SessionAnswer::getQualityScore).average().orElse(0);

        // ── Tech strengths ────────────────────────────────────────────────────
        Map<String, List<Integer>> techScoreMap = new LinkedHashMap<>();
        for (InterviewSessionRecord s : allSessions) {
            String tech = resolveTech(s);
            answerRepository.findBySessionIdOrderByCreatedAtAsc(s.getId()).stream()
                .filter(a -> a.getScore() != null)
                .forEach(a -> techScoreMap.computeIfAbsent(tech, k -> new ArrayList<>()).add(a.getScore()));
        }

        List<BotDtos.TechStrengthDto> techStrengths = techScoreMap.entrySet().stream()
            .map(e -> {
                double avg = e.getValue().stream().mapToInt(Integer::intValue).average().orElse(0);
                avg = Math.round(avg * 10.0) / 10.0;
                String level = avg >= 8 ? "Strong" : avg >= 6 ? "Moderate" : "Needs Work";
                return new BotDtos.TechStrengthDto(e.getKey(), avg, e.getValue().size(), level);
            })
            .sorted(Comparator.comparingDouble(BotDtos.TechStrengthDto::avgScore).reversed())
            .toList();

        String bestTechStack = techStrengths.isEmpty() ? "—" : techStrengths.get(0).tech();
        double bestTechScore  = techStrengths.isEmpty() ? 0  : techStrengths.get(0).avgScore();
        String weakestArea    = techStrengths.isEmpty() ? "—" : techStrengths.get(techStrengths.size() - 1).tech();
        double weakestScore   = techStrengths.isEmpty() ? 0  : techStrengths.get(techStrengths.size() - 1).avgScore();

        List<String> strongAreas = techStrengths.stream()
            .filter(t -> t.avgScore() >= 7 && t.questionsAnswered() >= 2)
            .map(BotDtos.TechStrengthDto::tech).limit(5).toList();

        List<String> weakAreas = techStrengths.stream()
            .filter(t -> t.avgScore() < 5 && t.questionsAnswered() >= 2)
            .map(BotDtos.TechStrengthDto::tech).limit(5).toList();

        // ── Account-level stats ───────────────────────────────────────────────
        Map<String, List<InterviewSessionRecord>> byAccount = completed.stream()
            .collect(Collectors.groupingBy(s ->
                s.getCompany() != null && !s.getCompany().isBlank() ? s.getCompany() : "General"));

        List<BotDtos.AccountStatsDto> accountStats = byAccount.entrySet().stream()
            .map(e -> {
                double avg = e.getValue().stream()
                    .mapToDouble(InterviewSessionRecord::getOverallScore).average().orElse(0);
                avg = Math.round(avg * 10.0) / 10.0;
                String level = avg >= 8 ? "Strong" : avg >= 6 ? "Moderate" : "Needs Work";
                return new BotDtos.AccountStatsDto(e.getKey(), e.getValue().size(), avg, level);
            })
            .sorted(Comparator.comparingDouble(BotDtos.AccountStatsDto::avgScore).reversed())
            .toList();

        // ── Score trend — use sessions that have an overallScore ─────────────
        List<BotDtos.ScoreTrendDto> scoreTrend = allSessions.stream()
            .filter(s -> s.getOverallScore() != null)
            .sorted(Comparator.comparing(s -> s.getCompletedAt() != null ? s.getCompletedAt() : s.getCreatedAt()))
            .limit(20)
            .map(s -> {
                String date = s.getCompletedAt() != null
                    ? s.getCompletedAt().format(CHART_FMT)
                    : s.getCreatedAt().format(CHART_FMT);
                String label = resolveTech(s);
                return new BotDtos.ScoreTrendDto(date, round(s.getOverallScore()), label);
            })
            .toList();

        // ── Recent interviews (last 5 with a score) ──────────────────────────
        List<BotDtos.RecentInterviewDto> recentInterviews = allSessions.stream()
            .filter(s -> s.getOverallScore() != null)
            .limit(5)
            .map(s -> new BotDtos.RecentInterviewDto(
                s.getId().toString(),
                s.getMode(),
                resolveTech(s),
                s.getCompany() != null ? s.getCompany() : "General",
                round(s.getOverallScore()),
                s.getSkillLevel() != null ? s.getSkillLevel() : "—",
                s.getCompletedAt() != null ? s.getCompletedAt().toString() : ""))
            .toList();

        log.info("[METRICS] total={} completed={} dbAnswers={} techs={} accounts={}",
            allSessions.size(), completed.size(), dbQuestionsCompleted,
            techStrengths.size(), accountStats.size());

        return new BotDtos.UserMetricsDto(
            allSessions.size(), dbQuestionsCompleted, confidentAnswers, needsImprovement,
            round(overallAvgScore), round(avgClarity), round(avgDepth), round(avgQuality),
            bestTechStack, bestTechScore, weakestArea, weakestScore,
            techStrengths, accountStats, scoreTrend, recentInterviews,
            strongAreas, weakAreas);
    }

    private String resolveTech(InterviewSessionRecord s) {
        if (s.getTechStack() != null && !s.getTechStack().isBlank()) return s.getTechStack();
        if (s.getRole()     != null && !s.getRole().isBlank())       return s.getRole();
        return "General";
    }

    private double round(double v) { return Math.round(v * 10.0) / 10.0; }
}
