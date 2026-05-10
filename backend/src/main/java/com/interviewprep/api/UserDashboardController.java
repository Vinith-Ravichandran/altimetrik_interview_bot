package com.interviewprep.api;

import com.interviewprep.domain.AppUser;
import com.interviewprep.domain.InterviewSession;
import com.interviewprep.domain.InterviewSessionRecord;
import com.interviewprep.dto.Dtos.*;
import com.interviewprep.repository.AppUserRepository;
import com.interviewprep.repository.InterviewSessionRecordRepository;
import com.interviewprep.repository.InterviewSessionRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/dashboard")
public class UserDashboardController {

    private final AppUserRepository                userRepository;
    private final InterviewSessionRepository       sessionRepository;      // app.interview_sessions (standard)
    private final InterviewSessionRecordRepository botSessionRepository;   // interview_bot.interview_sessions (bot)

    public UserDashboardController(AppUserRepository userRepository,
                                   InterviewSessionRepository sessionRepository,
                                   InterviewSessionRecordRepository botSessionRepository) {
        this.userRepository      = userRepository;
        this.sessionRepository   = sessionRepository;
        this.botSessionRepository = botSessionRepository;
    }

    // ── GET /api/v1/dashboard/user ────────────────────────────────────────────

    @GetMapping("/user")
    public ResponseEntity<UserDashboardDto> getUserDashboard(Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).build();

        AppUser user = resolveUser(auth);
        if (user == null) return ResponseEntity.status(404).build();

        List<InterviewSession> all = sessionRepository.findByUser_Id(user.getId());
        List<InterviewSession> completed = all.stream()
            .filter(s -> s.getCompletedAt() != null && s.getOverallScore() != null).toList();

        double avgScore  = completed.isEmpty() ? 0 : completed.stream().mapToDouble(InterviewSession::getOverallScore).average().orElse(0);
        double bestScore = completed.isEmpty() ? 0 : completed.stream().mapToDouble(InterviewSession::getOverallScore).max().orElse(0);

        InterviewSession latest = completed.stream().max(Comparator.comparing(InterviewSession::getCompletedAt)).orElse(null);

        return ResponseEntity.ok(new UserDashboardDto(
            all.size(), completed.size(), round(avgScore), round(bestScore),
            deriveSkillLevel(avgScore),
            latest != null ? latest.getOverallScore() : null,
            latest != null ? latest.getOverallFeedback() : null,
            latest != null ? latest.getCompletedAt() : null));
    }

    // ── GET /api/v1/dashboard/admin ───────────────────────────────────────────

    @GetMapping("/admin")
    public ResponseEntity<AdminDashboardDto> getAdminDashboard(Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).build();
        AppUser requester = resolveUser(auth);
        if (requester == null || !requester.isAdmin()) return ResponseEntity.status(403).build();

        List<AppUser> allUsers = userRepository.findAll();

        // ── Use interview_bot.interview_sessions — that's where real data lives ──
        List<InterviewSessionRecord> allBotSessions = botSessionRepository.findAll();
        List<InterviewSessionRecord> completedBot = allBotSessions.stream()
            .filter(s -> "COMPLETED".equals(s.getStatus()) && s.getOverallScore() != null)
            .toList();

        long totalSessions     = allBotSessions.size();
        long completedSessions = completedBot.size();
        double avgScore = completedBot.isEmpty() ? 0
            : completedBot.stream().mapToDouble(InterviewSessionRecord::getOverallScore).average().orElse(0);

        // ── Per-user rows (bot sessions) ──────────────────────────────────────
        List<AdminUserRowDto> userRows = allUsers.stream().map(u -> {
            List<InterviewSessionRecord> uSessions = allBotSessions.stream()
                .filter(s -> u.getId().equals(s.getUserId())).toList();
            List<InterviewSessionRecord> uCompleted = uSessions.stream()
                .filter(s -> "COMPLETED".equals(s.getStatus()) && s.getOverallScore() != null).toList();
            double uAvg  = uCompleted.isEmpty() ? 0 : uCompleted.stream().mapToDouble(InterviewSessionRecord::getOverallScore).average().orElse(0);
            double uBest = uCompleted.isEmpty() ? 0 : uCompleted.stream().mapToDouble(InterviewSessionRecord::getOverallScore).max().orElse(0);
            LocalDateTime uLast = uCompleted.stream().map(InterviewSessionRecord::getCompletedAt)
                .filter(Objects::nonNull).max(Comparator.naturalOrder()).orElse(null);
            return new AdminUserRowDto(
                u.getId(), u.getName(), u.getRoleName(), u.getAccountName(),
                uSessions.size(), uCompleted.size(), round(uAvg), round(uBest),
                uLast != null ? uLast.toInstant(ZoneOffset.UTC) : null);
        }).sorted(Comparator.comparingDouble(AdminUserRowDto::avgScore).reversed()).toList();

        // ── Top 5 performers (by avg score, at least 1 session) ──────────────
        List<AdminUserRowDto> topPerformers = userRows.stream()
            .filter(u -> u.completedSessions() > 0).limit(5).toList();

        // ── Recent activity (last 10 completed bot sessions) ──────────────────
        // Build userId → name lookup
        Map<UUID, String> nameById = allUsers.stream()
            .collect(Collectors.toMap(AppUser::getId, AppUser::getName));

        List<RecentActivityDto> recentActivity = completedBot.stream()
            .filter(s -> s.getCompletedAt() != null)
            .sorted(Comparator.comparing(InterviewSessionRecord::getCompletedAt).reversed())
            .limit(10)
            .map(s -> new RecentActivityDto(
                s.getUserId() != null ? nameById.getOrDefault(s.getUserId(), "Unknown") : "Unknown",
                s.getCompany() != null ? s.getCompany() : "—",
                resolveTech(s),
                round(s.getOverallScore()),
                s.getCompletedAt().toInstant(ZoneOffset.UTC)))
            .toList();

        return ResponseEntity.ok(new AdminDashboardDto(
            allUsers.size(), totalSessions, completedSessions,
            round(avgScore), userRows, topPerformers, recentActivity));
    }

    // ── Nested response types ─────────────────────────────────────────────────

    public record AdminDashboardDto(
        long   totalUsers, long totalSessions, long completedSessions, double avgScore,
        List<AdminUserRowDto>   allUsers,
        List<AdminUserRowDto>   topPerformers,
        List<RecentActivityDto> recentActivity) {}

    public record RecentActivityDto(
        String userName, String accountName, String roleName,
        double score, Instant completedAt) {}

    // ── Helpers ───────────────────────────────────────────────────────────────

    private AppUser resolveUser(Authentication auth) {
        if (auth == null) return null;
        try {
            return userRepository.findById(UUID.fromString(auth.getName())).orElse(null);
        } catch (IllegalArgumentException e) {
            return userRepository.findByName(auth.getName()).orElse(null);
        }
    }

    private String resolveTech(InterviewSessionRecord s) {
        if (s.getTechStack() != null && !s.getTechStack().isBlank()) return s.getTechStack();
        if (s.getRole()     != null && !s.getRole().isBlank())       return s.getRole();
        return "General";
    }

    private static double round(double v) { return Math.round(v * 10.0) / 10.0; }

    private static String deriveSkillLevel(double avg) {
        if (avg >= 8) return "Advanced";
        if (avg >= 6) return "Intermediate";
        if (avg >= 4) return "Beginner";
        return avg > 0 ? "Novice" : "Not Attempted";
    }
}
