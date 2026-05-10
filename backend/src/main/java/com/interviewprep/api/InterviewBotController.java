package com.interviewprep.api;

import com.interviewprep.domain.AppUser;
import com.interviewprep.domain.FileRecord;
import com.interviewprep.dto.BotDtos;
import com.interviewprep.repository.AppUserRepository;
import com.interviewprep.service.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/bot")
public class InterviewBotController {

    private static final Logger log = LoggerFactory.getLogger(InterviewBotController.class);

    private final BotFileService            botFileService;
    private final ProcessingService         processingService;
    private final BotQuestionService        questionService;
    private final BotInterviewService       interviewService;
    private final TechStackInterviewService techStackService;
    private final UserMetricsService        metricsService;
    private final AppUserRepository         userRepository;

    public InterviewBotController(BotFileService botFileService,
                                   ProcessingService processingService,
                                   BotQuestionService questionService,
                                   BotInterviewService interviewService,
                                   TechStackInterviewService techStackService,
                                   UserMetricsService metricsService,
                                   AppUserRepository userRepository) {
        this.botFileService   = botFileService;
        this.processingService = processingService;
        this.questionService  = questionService;
        this.interviewService = interviewService;
        this.techStackService = techStackService;
        this.metricsService   = metricsService;
        this.userRepository   = userRepository;
    }

    // ── Ingestion ─────────────────────────────────────────────────────────────

    @PostMapping("/upload")
    public ResponseEntity<BotDtos.UploadResponse> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "userId", required = false) UUID userId) {
        if (userId == null) userId = UUID.randomUUID();
        return ResponseEntity.ok(botFileService.uploadFile(file, userId));
    }

    @PostMapping("/process/{fileId}")
    public ResponseEntity<BotDtos.ProcessResponse> process(
            @PathVariable UUID fileId,
            @RequestParam(defaultValue = "General") String company,
            @RequestParam(defaultValue = "General") String role) {
        FileRecord record = botFileService.getFileRecord(fileId);
        return ResponseEntity.ok(processingService.processFile(fileId, record.getFilePath(), company, role));
    }

    @GetMapping("/questions")
    public ResponseEntity<List<BotDtos.BotQuestionDto>> getQuestions(
            @RequestParam(required = false) String company,
            @RequestParam(required = false) String role) {
        return ResponseEntity.ok(questionService.getQuestions(company, role));
    }

    // ── Mode 1: DB Questions interview ────────────────────────────────────────

    @PostMapping("/interview/start")
    public ResponseEntity<BotDtos.InterviewStartResponse> start(
            @RequestBody BotDtos.InterviewStartRequest request, Authentication auth) {
        UUID userId = resolveUserId(auth);
        log.info("[BOT] INTERVIEW_START — company={} role={}", request.company(), request.role());
        return ResponseEntity.ok(interviewService.startInterview(request.company(), request.role(), userId));
    }

    @PostMapping("/interview/answer")
    public ResponseEntity<BotDtos.AnswerResponse> answer(@RequestBody BotDtos.AnswerRequest request) {
        log.info("[BOT] ANSWER — sessionId={}", request.sessionId());
        return ResponseEntity.ok(interviewService.submitAnswer(request.sessionId(), request.answer()));
    }

    @PostMapping("/interview/end")
    public ResponseEntity<BotDtos.EndInterviewResponse> end(@RequestBody BotDtos.EndInterviewRequest request) {
        log.info("[BOT] INTERVIEW_END — sessionId={}", request.sessionId());
        return ResponseEntity.ok(interviewService.endInterview(request.sessionId()));
    }

    @GetMapping("/interview/history")
    public ResponseEntity<List<BotDtos.SessionHistoryDto>> history(Authentication auth) {
        UUID userId = resolveUserId(auth);
        return ResponseEntity.ok(interviewService.getHistory(userId));
    }

    // ── Mode 2: Tech Stack evaluation ────────────────────────────────────────

    @PostMapping("/tech-stack/start")
    public ResponseEntity<BotDtos.TechStackStartResponse> techStart(
            @RequestBody BotDtos.TechStackStartRequest request, Authentication auth) {
        UUID userId = resolveUserId(auth);
        log.info("[BOT] TECH_STACK_START — stack={}", request.techStack());
        return ResponseEntity.ok(techStackService.start(request.techStack(), userId));
    }

    @PostMapping("/tech-stack/answer")
    public ResponseEntity<BotDtos.TechStackAnswerResponse> techAnswer(
            @RequestBody BotDtos.TechStackAnswerRequest request) {
        log.info("[BOT] TECH_ANSWER — sessionId={}", request.sessionId());
        return ResponseEntity.ok(techStackService.submitAnswer(request.sessionId(), request.answer()));
    }

    @PostMapping("/tech-stack/end")
    public ResponseEntity<BotDtos.TechStackEndResponse> techEnd(
            @RequestBody BotDtos.TechStackEndRequest request) {
        log.info("[BOT] TECH_END — sessionId={}", request.sessionId());
        return ResponseEntity.ok(techStackService.end(request.sessionId()));
    }

    // ── Metrics ───────────────────────────────────────────────────────────────

    @GetMapping("/metrics")
    public ResponseEntity<BotDtos.UserMetricsDto> metrics(Authentication auth) {
        UUID userId = resolveUserId(auth);
        return ResponseEntity.ok(metricsService.getMetrics(userId != null ? userId : UUID.randomUUID()));
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private UUID resolveUserId(Authentication auth) {
        if (auth == null) return null;
        // JWT subject is user.getId().toString() — parse directly as UUID
        try {
            return UUID.fromString(auth.getName());
        } catch (IllegalArgumentException e) {
            // Fallback: name-based lookup for legacy tokens
            return userRepository.findByName(auth.getName()).map(AppUser::getId).orElse(null);
        }
    }
}
