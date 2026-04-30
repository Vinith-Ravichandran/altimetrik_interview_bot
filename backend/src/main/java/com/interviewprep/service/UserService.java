package com.interviewprep.service;

import com.interviewprep.domain.AppUser;
import com.interviewprep.dto.Dtos.*;
import com.interviewprep.repository.AppUserRepository;
import com.interviewprep.repository.InterviewSessionRepository;
import com.interviewprep.repository.RealInterviewLogRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
public class UserService {

    private final AppUserRepository          userRepo;
    private final InterviewSessionRepository sessionRepo;
    private final RealInterviewLogRepository realInterviewRepo;
    private final PasswordEncoder            passwordEncoder;

    public UserService(AppUserRepository userRepo,
                       InterviewSessionRepository sessionRepo,
                       RealInterviewLogRepository realInterviewRepo,
                       PasswordEncoder passwordEncoder) {
        this.userRepo          = userRepo;
        this.sessionRepo       = sessionRepo;
        this.realInterviewRepo = realInterviewRepo;
        this.passwordEncoder   = passwordEncoder;
    }

    // ── CRUD ──────────────────────────────────────────────────────────────────

    @Transactional
    public UserDto create(CreateUserRequest req) {
        if (userRepo.existsByName(req.name())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "User name already taken: " + req.name());
        }
        AppUser u = new AppUser();
        u.setName(req.name().trim());
        u.setPasswordHash(passwordEncoder.encode(req.password()));
        u.setRoleName(req.roleName());
        u.setAccountName(req.accountName());
        u.setAdmin(req.admin());
        u.setActive(true);
        return UserDto.of(userRepo.save(u));
    }

    public List<UserDto> list() {
        return userRepo.findAll().stream().map(UserDto::of).toList();
    }

    public UserDto getById(UUID id) {
        return UserDto.of(findOrThrow(id));
    }

    @Transactional
    public UserDto update(UUID id, UpdateUserRequest req) {
        AppUser u = findOrThrow(id);
        if (req.roleName()    != null) u.setRoleName(req.roleName());
        if (req.accountName() != null) u.setAccountName(req.accountName());
        return UserDto.of(userRepo.save(u));
    }

    @Transactional
    public void delete(UUID id) {
        if (!userRepo.existsById(id)) throw notFound(id);
        userRepo.deleteById(id);
    }

    // ── Stats ─────────────────────────────────────────────────────────────────

    public UserStatsDto stats(UUID userId) {
        AppUser u = findOrThrow(userId);

        var sessions = sessionRepo.findAll().stream()
                .filter(s -> s.getUser() != null && s.getUser().getId().equals(userId))
                .filter(s -> s.getCompletedAt() != null && s.getOverallScore() != null)
                .toList();

        double avg  = sessions.isEmpty() ? 0 :
                sessions.stream().mapToDouble(s -> (double) s.getOverallScore()).average().orElse(0);
        double high = sessions.isEmpty() ? 0 :
                sessions.stream().mapToDouble(s -> (double) s.getOverallScore()).max().orElse(0);

        var realLogs = realInterviewRepo.findAll().stream()
                .filter(l -> l.getAccount() != null)
                .count();

        var lastActivity = sessions.stream()
                .map(s -> s.getCompletedAt())
                .filter(t -> t != null)
                .max(java.time.Instant::compareTo)
                .orElse(null);

        return new UserStatsDto(
                u.getId(), u.getName(), u.getRoleName(), u.getAccountName(),
                u.getMockCount(),
                Math.round(avg * 10.0) / 10.0,
                Math.round(high * 10.0) / 10.0,
                realLogs, lastActivity);
    }

    // ── Admin operations ──────────────────────────────────────────────────────

    @Transactional
    public UserDto promoteToAdmin(UUID id) {
        AppUser u = findOrThrow(id);
        u.setAdmin(true);
        return UserDto.of(userRepo.save(u));
    }

    @Transactional
    public UserDto setActive(UUID id, boolean active) {
        AppUser u = findOrThrow(id);
        u.setActive(active);
        return UserDto.of(userRepo.save(u));
    }

    // ── Increment mock count (called by InterviewService on session finish) ───

    @Transactional
    public void incrementMockCount(UUID userId) {
        userRepo.findById(userId).ifPresent(u -> {
            u.setMockCount(u.getMockCount() + 1);
            userRepo.save(u);
        });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private AppUser findOrThrow(UUID id) {
        return userRepo.findById(id).orElseThrow(() -> notFound(id));
    }

    private ResponseStatusException notFound(UUID id) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found: " + id);
    }
}
