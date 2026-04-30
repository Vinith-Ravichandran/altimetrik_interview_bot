package com.interviewprep.api;

import com.interviewprep.domain.InterviewSession;
import com.interviewprep.dto.Dtos.*;
import com.interviewprep.repository.AppUserRepository;
import com.interviewprep.repository.InterviewSessionRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/admin/dashboard")
public class DashboardController {

    private final InterviewSessionRepository sessionRepository;
    private final AppUserRepository          userRepository;

    public DashboardController(InterviewSessionRepository sessionRepository,
                               AppUserRepository userRepository) {
        this.sessionRepository = sessionRepository;
        this.userRepository    = userRepository;
    }

    @GetMapping("/summary")
    @PreAuthorize("hasRole('ADMIN')")
    public DashboardSummaryDto getSummary() {
        long totalUsers = userRepository.count();
        List<InterviewSession> all = sessionRepository.findAll();

        List<InterviewSession> completed = all.stream()
                .filter(s -> s.getCompletedAt() != null && s.getOverallScore() != null)
                .toList();

        double avgScore = completed.isEmpty() ? 0 :
                completed.stream().mapToDouble(s -> s.getOverallScore()).average().orElse(0);

        Map<String, List<Double>> roleScores = completed.stream()
                .filter(s -> s.getRole() != null)
                .collect(Collectors.groupingBy(
                        s -> s.getRole().getName(),
                        Collectors.mapping(s -> s.getOverallScore(), Collectors.toList())));

        String topRole  = "—";
        double topScore = 0;
        for (var e : roleScores.entrySet()) {
            double avg = e.getValue().stream().mapToDouble(d -> d).average().orElse(0);
            if (avg > topScore) { topScore = avg; topRole = e.getKey(); }
        }

        return new DashboardSummaryDto(
                totalUsers, all.size(), completed.size(),
                Math.round(avgScore * 10.0) / 10.0, topRole,
                Math.round(topScore * 10.0) / 10.0);
    }

    @GetMapping("/sessions-by-week")
    @PreAuthorize("hasRole('ADMIN')")
    public List<WeeklyCountDto> getSessionsByWeek() {
        List<InterviewSession> sessions = sessionRepository.findAll();
        Instant now = Instant.now();
        int weeks = 8;

        List<WeeklyCountDto> result = new ArrayList<>();
        for (int i = weeks - 1; i >= 0; i--) {
            Instant from = now.minus((long)(i + 1) * 7, ChronoUnit.DAYS);
            Instant to   = now.minus((long) i       * 7, ChronoUnit.DAYS);

            long count = sessions.stream()
                    .filter(s -> s.getStartedAt().isAfter(from) && s.getStartedAt().isBefore(to))
                    .count();

            java.time.LocalDate d = to.atZone(java.time.ZoneOffset.UTC).toLocalDate();
            String label = d.getMonth().getDisplayName(java.time.format.TextStyle.SHORT, Locale.ENGLISH)
                    + " " + d.getDayOfMonth();

            result.add(new WeeklyCountDto(label, count));
        }
        return result;
    }

    @GetMapping("/users/performance")
    @PreAuthorize("hasRole('ADMIN')")
    public List<UserStatsDto> getUserPerformance() {
        return userRepository.findAll().stream().map(u -> {
            var sessions = sessionRepository.findAll().stream()
                    .filter(s -> s.getUser() != null && s.getUser().getId().equals(u.getId()))
                    .filter(s -> s.getCompletedAt() != null && s.getOverallScore() != null)
                    .toList();

            double avg  = sessions.isEmpty() ? 0 : sessions.stream().mapToDouble(s -> s.getOverallScore()).average().orElse(0);
            double high = sessions.isEmpty() ? 0 : sessions.stream().mapToDouble(s -> s.getOverallScore()).max().orElse(0);
            Instant last = sessions.stream().map(s -> s.getCompletedAt())
                    .filter(Objects::nonNull).max(Instant::compareTo).orElse(null);

            return new UserStatsDto(
                    u.getId(), u.getName(), u.getRoleName(), u.getAccountName(),
                    u.getMockCount(),
                    Math.round(avg  * 10.0) / 10.0,
                    Math.round(high * 10.0) / 10.0,
                    0L, last);
        }).toList();
    }
}
