package com.interviewprep.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.interviewprep.domain.BotQuestion;
import com.interviewprep.domain.InterviewSessionRecord;
import com.interviewprep.domain.SessionAnswer;
import com.interviewprep.dto.BotDtos;
import com.interviewprep.repository.BotQuestionRepository;
import com.interviewprep.repository.InterviewSessionRecordRepository;
import com.interviewprep.repository.SessionAnswerRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class BotInterviewService {

    private static final Logger log = LoggerFactory.getLogger(BotInterviewService.class);
    private static final int MAX_DEPTH     = 3;
    private static final int MAX_FAILURES  = 2;
    private static final int MAX_QUESTIONS = 10;

    private final BotQuestionRepository            questionRepository;
    private final InterviewSessionRecordRepository sessionRepository;
    private final SessionAnswerRepository          answerRepository;
    private final LLMService                       llmService;
    private final ObjectMapper                     objectMapper;

    private final Map<String, InterviewSession> activeSessions = new ConcurrentHashMap<>();

    public BotInterviewService(BotQuestionRepository questionRepository,
                                InterviewSessionRecordRepository sessionRepository,
                                SessionAnswerRepository answerRepository,
                                LLMService llmService,
                                ObjectMapper objectMapper) {
        this.questionRepository = questionRepository;
        this.sessionRepository  = sessionRepository;
        this.answerRepository   = answerRepository;
        this.llmService         = llmService;
        this.objectMapper       = objectMapper;
    }

    // ── Start ─────────────────────────────────────────────────────────────────

    public BotDtos.InterviewStartResponse startInterview(String company, String role, UUID userId) {
        log.info("[BOT] START company={} role={}", company, role);

        List<BotQuestion> pool = questionRepository.findByCompanyAndRole(company, role);
        if (pool.isEmpty()) pool = questionRepository.findByRole(role);
        if (pool.isEmpty()) pool = new ArrayList<>(questionRepository.findAll());
        if (pool.isEmpty()) throw new RuntimeException("No questions available");

        Collections.shuffle(pool);
        List<BotQuestion> selected = pool.stream().limit(MAX_QUESTIONS).toList();
        List<UUID> poolIds = selected.stream().map(BotQuestion::getId).toList();

        String firstQuestion = selected.get(0).getContent();

        InterviewSessionRecord record = new InterviewSessionRecord();
        record.setId(UUID.randomUUID());
        record.setCompany(company);
        record.setRole(role);
        record.setUserId(userId);
        record.setMode("DB_QUESTIONS");
        record.setStatus("ACTIVE");
        record.setCurrentQuestion(firstQuestion);
        record.setDepthLevel(0);
        record.setFailureCount(0);
        record.setQuestionPoolJson(toJson(poolIds));
        record.setCreatedAt(LocalDateTime.now());
        sessionRepository.save(record);

        String sessionId = record.getId().toString();
        activeSessions.put(sessionId, new InterviewSession(sessionId, record.getId(), selected));
        log.info("[BOT] Session created sessionId={}", sessionId);
        return new BotDtos.InterviewStartResponse(sessionId, toDto(selected.get(0)));
    }

    // ── Answer ────────────────────────────────────────────────────────────────

    public BotDtos.AnswerResponse submitAnswer(String sessionId, String answer) {
        InterviewSession session = requireSession(sessionId);
        if (session.isComplete())
            return new BotDtos.AnswerResponse(sessionId, null, true,
                0,"",0,"",0,"", 0, "Interview already completed.", "");

        String currentQuestion = session.getCurrentQuestion();
        boolean isFollowup     = session.getDepthLevel() > 0;

        BotDtos.DetailedEvaluationResult eval = llmService.evaluateDetailed(
            currentQuestion, answer, session.getHistory(), session.getDepthLevel());

        session.addToHistory(currentQuestion, answer, (int) Math.round(eval.overall()), eval.feedback());

        // Persist Q&A
        SessionAnswer sa = new SessionAnswer();
        sa.setId(UUID.randomUUID());
        sa.setSessionId(session.getDbSessionId());
        sa.setQuestion(currentQuestion);
        sa.setAnswer(answer);
        sa.setScore((int) Math.round(eval.overall()));
        sa.setFeedback(eval.feedback());
        sa.setImprovedAnswer(eval.improvedAnswer());
        sa.setClarityScore(eval.clarity());
        sa.setClarityJustification(eval.clarityJustification());
        sa.setDepthScore(eval.depth());
        sa.setDepthJustification(eval.depthJustification());
        sa.setQualityScore(eval.quality());
        sa.setQualityJustification(eval.qualityJustification());
        sa.setFollowup(isFollowup);
        sa.setDepthLevel(session.getDepthLevel());
        sa.setCreatedAt(LocalDateTime.now());
        answerRepository.save(sa);

        if (eval.overall() < 4) session.incrementFailureCount();

        boolean canDeepen = "FOLLOW_UP".equals(eval.nextAction())
            && eval.nextQuestion() != null
            && session.getDepthLevel() < MAX_DEPTH
            && session.getFailureCount() < MAX_FAILURES;

        String nextQuestion;
        boolean complete = false;

        if (canDeepen) {
            session.setCurrentQuestion(eval.nextQuestion());
            session.incrementDepth();
            nextQuestion = eval.nextQuestion();
        } else {
            session.resetTopicCounters();
            if (session.hasNextQuestion()) {
                session.advanceQuestion();
                nextQuestion = session.getCurrentQuestion();
            } else {
                session.setComplete(true);
                nextQuestion = null;
                complete = true;
            }
        }

        persistSessionState(session);

        return new BotDtos.AnswerResponse(sessionId, nextQuestion, complete,
            eval.clarity(),  eval.clarityJustification(),
            eval.depth(),    eval.depthJustification(),
            eval.quality(),  eval.qualityJustification(),
            eval.overall(),  eval.feedback(), eval.improvedAnswer());
    }

    // ── End ───────────────────────────────────────────────────────────────────

    public BotDtos.EndInterviewResponse endInterview(String sessionId) {
        InterviewSession session = requireSession(sessionId);
        session.setComplete(true);

        List<Map<String, String>> history = session.getHistory();
        BotDtos.EndInterviewResponse response = history.isEmpty()
            ? new BotDtos.EndInterviewResponse(sessionId, 0.0, "Beginner",
                List.of(), List.of("No answers provided."), List.of())
            : parseFinalReport(sessionId, llmService.generateFinalReport(history));

        sessionRepository.findById(session.getDbSessionId()).ifPresent(r -> {
            r.setStatus("COMPLETED");
            r.setCompletedAt(LocalDateTime.now());
            r.setOverallScore(response.overallScore());
            r.setSkillLevel(response.skillLevel());
            r.setOverallFeedback("Strengths: " + String.join(", ", response.strengths())
                + "\nWeaknesses: " + String.join(", ", response.weaknesses()));
            sessionRepository.save(r);
        });

        activeSessions.remove(sessionId);
        log.info("[BOT] END sessionId={} score={}", sessionId, response.overallScore());
        return response;
    }

    // ── History ───────────────────────────────────────────────────────────────

    public List<BotDtos.SessionHistoryDto> getHistory(UUID userId) {
        return sessionRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
            .map(r -> {
                List<SessionAnswer> answers = answerRepository.findBySessionIdOrderByCreatedAtAsc(r.getId());
                List<BotDtos.SessionAnswerDto> dtos = answers.stream()
                    .map(a -> new BotDtos.SessionAnswerDto(
                        a.getQuestion(), a.getAnswer(), a.getScore(),
                        a.getClarityScore(),  a.getClarityJustification(),
                        a.getDepthScore(),    a.getDepthJustification(),
                        a.getQualityScore(),  a.getQualityJustification(),
                        a.getFeedback(), a.getImprovedAnswer(), a.isFollowup()))
                    .toList();
                return new BotDtos.SessionHistoryDto(
                    r.getId().toString(), r.getCompany(), r.getRole(),
                    r.getMode(), r.getTechStack(), r.getStatus(),
                    r.getOverallScore(), r.getSkillLevel(), r.getOverallFeedback(),
                    r.getCreatedAt() != null ? r.getCreatedAt().toString() : null,
                    r.getCompletedAt() != null ? r.getCompletedAt().toString() : null,
                    dtos);
            }).toList();
    }

    // ── Session restore ───────────────────────────────────────────────────────

    private InterviewSession requireSession(String sessionId) {
        InterviewSession s = activeSessions.get(sessionId);
        if (s != null) return s;

        // Not in memory — try to restore from database
        log.warn("[BOT] Session {} not in memory — attempting DB restore", sessionId);
        return restoreFromDb(sessionId);
    }

    private InterviewSession restoreFromDb(String sessionId) {
        UUID id = UUID.fromString(sessionId);
        InterviewSessionRecord record = sessionRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Session not found: " + sessionId));

        if ("COMPLETED".equals(record.getStatus()))
            throw new RuntimeException("Session already completed: " + sessionId);

        // Rebuild question pool from stored IDs
        List<BotQuestion> pool = new ArrayList<>();
        if (record.getQuestionPoolJson() != null) {
            try {
                List<String> ids = objectMapper.readValue(
                    record.getQuestionPoolJson(), new TypeReference<List<String>>() {});
                // Preserve order using a map
                Map<UUID, BotQuestion> byId = questionRepository.findAll().stream()
                    .collect(Collectors.toMap(BotQuestion::getId, q -> q));
                for (String qid : ids) {
                    BotQuestion q = byId.get(UUID.fromString(qid));
                    if (q != null) pool.add(q);
                }
            } catch (Exception e) {
                log.warn("[BOT] Could not restore question pool: {}", e.getMessage());
                pool = new ArrayList<>(questionRepository.findByCompanyAndRole(
                    record.getCompany(), record.getRole()));
            }
        }

        if (pool.isEmpty())
            throw new RuntimeException("Session cannot be restored — question pool is empty");

        // Rebuild history from session_answers
        List<SessionAnswer> savedAnswers = answerRepository.findBySessionIdOrderByCreatedAtAsc(id);
        Set<String> askedQuestions = savedAnswers.stream()
            .map(SessionAnswer::getQuestion).collect(Collectors.toSet());

        // Find which pool question index we're at
        int resumeIndex = 0;
        for (int i = 0; i < pool.size(); i++) {
            if (!askedQuestions.contains(pool.get(i).getContent())) {
                resumeIndex = i;
                break;
            }
        }

        InterviewSession session = new InterviewSession(sessionId, id, pool);
        session.setCurrentQuestionIndex(resumeIndex);

        // Restore current question from DB record (might be a follow-up)
        if (record.getCurrentQuestion() != null) {
            session.setCurrentQuestion(record.getCurrentQuestion());
        }

        // Restore counters
        session.forceSetDepthLevel(record.getDepthLevel());
        session.forceSetFailureCount(record.getFailureCount());

        // Rebuild history
        for (SessionAnswer sa : savedAnswers) {
            session.addToHistory(sa.getQuestion(), sa.getAnswer(),
                sa.getScore() != null ? sa.getScore() : 0,
                sa.getFeedback() != null ? sa.getFeedback() : "");
        }

        activeSessions.put(sessionId, session);
        log.info("[BOT] Restored session {} — resumeIndex={} historySize={}",
            sessionId, resumeIndex, savedAnswers.size());
        return session;
    }

    private void persistSessionState(InterviewSession session) {
        sessionRepository.findById(session.getDbSessionId()).ifPresent(r -> {
            r.setCurrentQuestion(session.getCurrentQuestion());
            r.setDepthLevel(session.getDepthLevel());
            r.setFailureCount(session.getFailureCount());
            sessionRepository.save(r);
        });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String toJson(Object obj) {
        try { return objectMapper.writeValueAsString(obj); }
        catch (Exception e) { return "[]"; }
    }

    private BotDtos.EndInterviewResponse parseFinalReport(String sessionId, String json) {
        try {
            String cleaned = extractJson(json, '{', '}');
            JsonNode node = objectMapper.readTree(cleaned);
            List<String> strengths = new ArrayList<>();
            node.path("strengths").forEach(s -> strengths.add(s.asText()));
            List<String> weaknesses = new ArrayList<>();
            node.path("weaknesses").forEach(w -> weaknesses.add(w.asText()));
            List<BotDtos.CategoryScore> cats = new ArrayList<>();
            for (JsonNode c : node.path("category_analysis"))
                cats.add(new BotDtos.CategoryScore(c.path("category").asText(),
                    c.path("score").asInt(5), c.path("level").asText("Intermediate")));
            return new BotDtos.EndInterviewResponse(sessionId,
                node.path("overall_score").asDouble(5),
                node.path("skill_level").asText("Intermediate"),
                strengths, weaknesses, cats);
        } catch (Exception e) {
            return new BotDtos.EndInterviewResponse(sessionId, 5.0, "Intermediate",
                List.of(), List.of("Evaluation parsing failed."), List.of());
        }
    }

    private String extractJson(String t, char open, char close) {
        int s = t.indexOf(open), e = t.lastIndexOf(close) + 1;
        return (s >= 0 && e > s) ? t.substring(s, e) : t;
    }

    private BotDtos.BotQuestionDto toDto(BotQuestion q) {
        return new BotDtos.BotQuestionDto(q.getId(), q.getContent(), q.getCategory(),
            q.getCompany(), q.getRole(), q.getDifficulty(), q.getCreatedAt());
    }

    // ── In-memory session ─────────────────────────────────────────────────────

    static class InterviewSession {
        private final String            sessionId;
        private final UUID              dbSessionId;
        private final List<BotQuestion> questions;
        private int     currentQuestionIndex = 0;
        private int     depthLevel           = 0;
        private int     failureCount         = 0;
        private String  currentQuestion;
        private boolean complete             = false;
        private final List<Map<String, String>> history = new ArrayList<>();

        InterviewSession(String sessionId, UUID dbSessionId, List<BotQuestion> questions) {
            this.sessionId       = sessionId;
            this.dbSessionId     = dbSessionId;
            this.questions       = questions;
            this.currentQuestion = questions.isEmpty() ? "" : questions.get(0).getContent();
        }

        public String  getSessionId()               { return sessionId; }
        public UUID    getDbSessionId()             { return dbSessionId; }
        public String  getCurrentQuestion()         { return currentQuestion; }
        public void    setCurrentQuestion(String q) { this.currentQuestion = q; }
        public int     getDepthLevel()              { return depthLevel; }
        public void    incrementDepth()             { depthLevel++; }
        public void    forceSetDepthLevel(int v)    { this.depthLevel = v; }
        public int     getFailureCount()            { return failureCount; }
        public void    incrementFailureCount()      { failureCount++; }
        public void    forceSetFailureCount(int v)  { this.failureCount = v; }
        public boolean isComplete()                 { return complete; }
        public void    setComplete(boolean v)       { this.complete = v; }
        public List<Map<String, String>> getHistory(){ return history; }
        public int     getCurrentQuestionIndex()    { return currentQuestionIndex; }
        public void    setCurrentQuestionIndex(int v){ this.currentQuestionIndex = v; }
        public void    resetTopicCounters()         { depthLevel = 0; failureCount = 0; }

        public void addToHistory(String q, String a, int score, String fb) {
            Map<String, String> e = new LinkedHashMap<>();
            e.put("question", q); e.put("answer", a);
            e.put("score", String.valueOf(score)); e.put("feedback", fb);
            history.add(e);
        }

        public boolean hasNextQuestion() { return currentQuestionIndex + 1 < questions.size(); }
        public void advanceQuestion() {
            currentQuestionIndex++;
            currentQuestion = questions.get(currentQuestionIndex).getContent();
        }
    }
}
