package com.interviewprep.api;

import com.interviewprep.domain.AppUser;
import com.interviewprep.domain.InterviewSession;
import com.interviewprep.dto.Dtos.*;
import com.interviewprep.repository.AppUserRepository;
import com.interviewprep.service.InterviewService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/interviews")
public class InterviewController {

    private final InterviewService  interviewService;
    private final AppUserRepository userRepository;

    public InterviewController(InterviewService interviewService,
                               AppUserRepository userRepository) {
        this.interviewService = interviewService;
        this.userRepository   = userRepository;
    }

    @PostMapping
    public InterviewSessionDto start(@RequestBody StartInterviewRequest req, Authentication auth) {
        // JWT subject is user UUID — pass directly so InterviewService can link the session
        String callerName = auth != null ? auth.getName() : null;
        return InterviewSessionDto.of(interviewService.start(req.accountId(), req.roleId(), callerName));
    }

    @GetMapping
    public List<InterviewSessionDto> list(Authentication auth) {
        if (auth == null) return List.of();

        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        if (isAdmin) {
            return interviewService.list().stream().map(InterviewSessionDto::of).toList();
        }

        // JWT subject = user UUID → parse directly
        UUID userId = resolveUserId(auth);
        if (userId == null) return List.of();
        return interviewService.listByUser(userId).stream().map(InterviewSessionDto::of).toList();
    }

    @GetMapping("/{id}")
    public InterviewSessionDto get(@PathVariable UUID id) {
        return InterviewSessionDto.of(interviewService.get(id));
    }

    @PostMapping("/{id}/next-question")
    public QuestionDto nextQuestion(@PathVariable UUID id) {
        InterviewSession session = interviewService.get(id);
        return QuestionDto.of(interviewService.generateNextQuestion(session));
    }

    @PostMapping("/questions/{questionId}/answer")
    public AnswerDto submitAnswer(@PathVariable UUID questionId, @RequestBody SubmitAnswerRequest req) {
        return AnswerDto.of(interviewService.submitAnswer(questionId, req.text()));
    }

    @PostMapping("/{id}/finish")
    public InterviewSessionDto finish(@PathVariable UUID id) {
        return InterviewSessionDto.of(interviewService.finish(id));
    }

    private UUID resolveUserId(Authentication auth) {
        if (auth == null) return null;
        try {
            return UUID.fromString(auth.getName()); // subject = user ID
        } catch (IllegalArgumentException e) {
            return userRepository.findByName(auth.getName()).map(AppUser::getId).orElse(null);
        }
    }
}
