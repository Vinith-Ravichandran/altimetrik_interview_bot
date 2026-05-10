package com.interviewprep.api;

import com.interviewprep.domain.AppUser;
import com.interviewprep.domain.InterviewSession;
import com.interviewprep.domain.InterviewSessionRecord;
import com.interviewprep.domain.SessionAnswer;
import com.interviewprep.dto.Dtos.*;
import com.interviewprep.repository.AppUserRepository;
import com.interviewprep.repository.InterviewSessionRecordRepository;
import com.interviewprep.repository.InterviewSessionRepository;
import com.interviewprep.repository.SessionAnswerRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/admin/dashboard")
public class DashboardController {

    private static final DateTimeFormatter CHART_FMT = DateTimeFormatter.ofPattern("MMM d");

    private final InterviewSessionRepository       sessionRepository;
    private final InterviewSessionRecordRepository botSessionRepository;
    private final SessionAnswerRepository          answerRepository;
    private final AppUserRepository                userRepository;

    public DashboardController(InterviewSessionRepository sessionRepository,
                               InterviewSessionRecordRepository botSessionRepository,
                               SessionAnswerRepository answerRepository,
                               AppUserRepository userRepository) {
        this.sessionRepository    = sessionRepository;
        this.botSessionRepository = botSessionRepository;
        this.answerRepository     = answerRepository;
        this.userRepository       = userRepository;
    }

    // ── Summary ───────────────────────────────────────────────────────────────

    // ── Auth helper — checks admin from DB, not JWT claim ────────────────────

    private boolean isAdminFromDb(Authentication auth) {
        if (auth == null) return false;
        try {
            UUID uid = UUID.fromString(auth.getName());
            return userRepository.findById(uid).map(AppUser::isAdmin).orElse(false);
        } catch (IllegalArgumentException e) {
            return userRepository.findByName(auth.getName()).map(AppUser::isAdmin).orElse(false);
        }
    }

    @GetMapping("/summary")
    public DashboardSummaryDto getSummary(Authentication auth) {
        long totalUsers = userRepository.count();
        List<InterviewSession> all = sessionRepository.findAll();
        List<InterviewSession> completed = all.stream()
            .filter(s -> s.getCompletedAt() != null && s.getOverallScore() != null).toList();

        double avgScore = completed.isEmpty() ? 0
            : completed.stream().mapToDouble(InterviewSession::getOverallScore).average().orElse(0);

        Map<String, List<Double>> roleScores = completed.stream()
            .filter(s -> s.getRole() != null)
            .collect(Collectors.groupingBy(s -> s.getRole().getName(),
                Collectors.mapping(InterviewSession::getOverallScore, Collectors.toList())));

        String topRole  = "—"; double topScore = 0;
        for (var e : roleScores.entrySet()) {
            double avg = e.getValue().stream().mapToDouble(d -> d).average().orElse(0);
            if (avg > topScore) { topScore = avg; topRole = e.getKey(); }
        }
        return new DashboardSummaryDto(totalUsers, all.size(), completed.size(),
            round(avgScore), topRole, round(topScore));
    }

    @GetMapping("/sessions-by-week")
    public List<WeeklyCountDto> getSessionsByWeek(Authentication auth) {
        List<InterviewSession> sessions = sessionRepository.findAll();
        Instant now = Instant.now();
        List<WeeklyCountDto> result = new ArrayList<>();
        for (int i = 7; i >= 0; i--) {
            Instant from = now.minus((long)(i + 1) * 7, ChronoUnit.DAYS);
            Instant to   = now.minus((long) i       * 7, ChronoUnit.DAYS);
            long count = sessions.stream()
                .filter(s -> s.getStartedAt().isAfter(from) && s.getStartedAt().isBefore(to)).count();
            java.time.LocalDate d = to.atZone(ZoneOffset.UTC).toLocalDate();
            String label = d.getMonth().getDisplayName(java.time.format.TextStyle.SHORT, Locale.ENGLISH) + " " + d.getDayOfMonth();
            result.add(new WeeklyCountDto(label, count));
        }
        return result;
    }

    @GetMapping("/users/performance")
    public List<UserStatsDto> getUserPerformance(Authentication auth) {
        return userRepository.findAll().stream().map(u -> {
            List<InterviewSessionRecord> botSessions =
                botSessionRepository.findByUserIdOrderByCreatedAtDesc(u.getId()).stream()
                    .filter(s -> "COMPLETED".equals(s.getStatus()) && s.getOverallScore() != null).toList();
            double avg  = botSessions.isEmpty() ? 0 : botSessions.stream().mapToDouble(InterviewSessionRecord::getOverallScore).average().orElse(0);
            double high = botSessions.isEmpty() ? 0 : botSessions.stream().mapToDouble(InterviewSessionRecord::getOverallScore).max().orElse(0);
            LocalDateTime last = botSessions.isEmpty() ? null : botSessions.get(0).getCompletedAt();
            return new UserStatsDto(u.getId(), u.getName(), u.getRoleName(), u.getAccountName(),
                botSessions.size(), round(avg), round(high), 0L,
                last != null ? last.toInstant(ZoneOffset.UTC) : null);
        }).toList();
    }

    // ── Per-user analytics panel ──────────────────────────────────────────────

    @GetMapping("/user/{userId}/analytics")
    public ResponseEntity<UserAnalyticsDto> getUserAnalytics(
            @PathVariable UUID userId, Authentication auth) {

        // Check admin from DB — works even when JWT predates the promotion
        if (!isAdminFromDb(auth)) return ResponseEntity.status(403).build();

        AppUser user = userRepository.findById(userId).orElse(null);
        if (user == null) return ResponseEntity.notFound().build();

        // All bot sessions for this user
        List<InterviewSessionRecord> allSessions =
            botSessionRepository.findByUserIdOrderByCreatedAtDesc(userId);

        List<InterviewSessionRecord> completed = allSessions.stream()
            .filter(s -> "COMPLETED".equals(s.getStatus())).toList();

        // All answers for these sessions
        List<SessionAnswer> allAnswers = allSessions.stream()
            .flatMap(s -> answerRepository.findBySessionIdOrderByCreatedAtAsc(s.getId()).stream())
            .filter(a -> a.getScore() != null)
            .toList();

        // ── Overview stats ────────────────────────────────────────────────────
        int totalAnswers      = allAnswers.size();
        int confidentAnswers  = (int) allAnswers.stream().filter(a -> a.getScore() >= 7).count();
        int needsImprovement  = (int) allAnswers.stream().filter(a -> a.getScore() <  5).count();
        double overallAvgScore = totalAnswers == 0 ? 0
            : allAnswers.stream().mapToInt(SessionAnswer::getScore).average().orElse(0);

        double avgClarity = allAnswers.stream().filter(a -> a.getClarityScore() != null)
            .mapToDouble(SessionAnswer::getClarityScore).average().orElse(0);
        double avgDepth   = allAnswers.stream().filter(a -> a.getDepthScore() != null)
            .mapToDouble(SessionAnswer::getDepthScore).average().orElse(0);
        double avgQuality = allAnswers.stream().filter(a -> a.getQualityScore() != null)
            .mapToDouble(SessionAnswer::getQualityScore).average().orElse(0);

        // ── Tech breakdown ────────────────────────────────────────────────────
        Map<String, List<Integer>> techMap = new LinkedHashMap<>();
        for (InterviewSessionRecord s : allSessions) {
            String tech = resolveTech(s);
            answerRepository.findBySessionIdOrderByCreatedAtAsc(s.getId()).stream()
                .filter(a -> a.getScore() != null)
                .forEach(a -> techMap.computeIfAbsent(tech, k -> new ArrayList<>()).add(a.getScore()));
        }
        List<TechStatDto> techBreakdown = techMap.entrySet().stream()
            .map(e -> {
                double avg = e.getValue().stream().mapToInt(Integer::intValue).average().orElse(0);
                String level = avg >= 8 ? "Strong" : avg >= 6 ? "Moderate" : "Needs Work";
                return new TechStatDto(e.getKey(), round(avg), e.getValue().size(), level);
            })
            .sorted(Comparator.comparingDouble(TechStatDto::avgScore).reversed())
            .toList();

        String bestTech      = techBreakdown.isEmpty() ? "—" : techBreakdown.get(0).tech();
        double bestTechScore = techBreakdown.isEmpty() ? 0  : techBreakdown.get(0).avgScore();
        String weakestTech   = techBreakdown.size() < 2 ? "—" : techBreakdown.get(techBreakdown.size() - 1).tech();

        List<String> strongAreas = techBreakdown.stream()
            .filter(t -> t.avgScore() >= 7 && t.count() >= 2)
            .map(TechStatDto::tech).limit(5).toList();
        List<String> weakAreas = techBreakdown.stream()
            .filter(t -> t.avgScore() < 5 && t.count() >= 2)
            .map(TechStatDto::tech).limit(5).toList();

        // ── Account breakdown ─────────────────────────────────────────────────
        Map<String, List<Double>> accMap = new LinkedHashMap<>();
        for (InterviewSessionRecord s : completed) {
            String acc = s.getCompany() != null && !s.getCompany().isBlank() ? s.getCompany() : "General";
            if (s.getOverallScore() != null)
                accMap.computeIfAbsent(acc, k -> new ArrayList<>()).add(s.getOverallScore());
        }
        List<AccountStatDto> accountBreakdown = accMap.entrySet().stream()
            .map(e -> {
                double avg = e.getValue().stream().mapToDouble(d -> d).average().orElse(0);
                String level = avg >= 8 ? "Strong" : avg >= 6 ? "Moderate" : "Needs Work";
                return new AccountStatDto(e.getKey(), e.getValue().size(), round(avg), level);
            })
            .sorted(Comparator.comparingDouble(AccountStatDto::avgScore).reversed())
            .toList();

        // ── Score trend ───────────────────────────────────────────────────────
        List<ScorePointDto> scoreTrend = allSessions.stream()
            .filter(s -> s.getOverallScore() != null && s.getCompletedAt() != null)
            .sorted(Comparator.comparing(InterviewSessionRecord::getCompletedAt))
            .limit(15)
            .map(s -> new ScorePointDto(
                s.getCompletedAt().format(CHART_FMT),
                round(s.getOverallScore()),
                resolveTech(s)))
            .toList();

        // ── Recent sessions — include all completed, sorted newest first ────────
        List<SessionSummaryDto> recentSessions = allSessions.stream()
            .filter(s -> s.getOverallScore() != null && s.getCompletedAt() != null)
            .sorted(Comparator.comparing(InterviewSessionRecord::getCompletedAt).reversed())
            .limit(10)
            .map(s -> buildSessionSummary(s))
            .toList();

        String memberSince = user.getCreatedAt() != null
            ? user.getCreatedAt().atZone(ZoneOffset.UTC).format(DateTimeFormatter.ofPattern("MMM yyyy"))
            : "—";

        return ResponseEntity.ok(new UserAnalyticsDto(
            user.getId(), user.getName(), user.getEmail(),
            user.getRoleName(), user.getAccountName(),
            user.isAdmin(), user.isActive(), memberSince,
            allSessions.size(), completed.size(),
            totalAnswers, confidentAnswers, needsImprovement,
            round(overallAvgScore), round(avgClarity), round(avgDepth), round(avgQuality),
            bestTech, bestTechScore, weakestTech,
            techBreakdown, accountBreakdown, scoreTrend, recentSessions,
            strongAreas, weakAreas));
    }

    private SessionSummaryDto buildSessionSummary(InterviewSessionRecord s) {
        List<SessionAnswer> sa = answerRepository.findBySessionIdOrderByCreatedAtAsc(s.getId());

        int totalQuestions    = sa.size();
        int answeredQuestions = (int) sa.stream()
            .filter(a -> a.getAnswer() != null && !a.getAnswer().isBlank()).count();
        int followUpCount     = (int) sa.stream().filter(SessionAnswer::isFollowup).count();

        double cl = sa.stream().filter(a -> a.getClarityScore() != null)
            .mapToDouble(SessionAnswer::getClarityScore).average().orElse(0);
        double dp = sa.stream().filter(a -> a.getDepthScore() != null)
            .mapToDouble(SessionAnswer::getDepthScore).average().orElse(0);
        double ql = sa.stream().filter(a -> a.getQualityScore() != null)
            .mapToDouble(SessionAnswer::getQualityScore).average().orElse(0);

        long durationMinutes = 0;
        if (s.getCreatedAt() != null && s.getCompletedAt() != null) {
            durationMinutes = java.time.temporal.ChronoUnit.MINUTES
                .between(s.getCreatedAt(), s.getCompletedAt());
        }

        return new SessionSummaryDto(
            s.getId().toString(),
            s.getMode(),
            resolveTech(s),
            s.getCompany() != null && !s.getCompany().isBlank() ? s.getCompany() : "General",
            round(s.getOverallScore()),
            s.getSkillLevel() != null ? s.getSkillLevel() : "—",
            s.getCreatedAt()   != null ? s.getCreatedAt().toString()   : "",
            s.getCompletedAt() != null ? s.getCompletedAt().toString() : "",
            durationMinutes,
            round(cl), round(dp), round(ql),
            totalQuestions, answeredQuestions, followUpCount
        );
    }

    private String resolveTech(InterviewSessionRecord s) {
        if (s.getTechStack() != null && !s.getTechStack().isBlank()) return s.getTechStack();
        if (s.getRole()     != null && !s.getRole().isBlank())       return s.getRole();
        return "General";
    }

    private double round(double v) { return Math.round(v * 10.0) / 10.0; }
}
