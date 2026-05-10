package com.interviewprep.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.interviewprep.domain.InterviewSessionRecord;
import com.interviewprep.domain.SessionAnswer;
import com.interviewprep.dto.BotDtos;
import com.interviewprep.repository.InterviewSessionRecordRepository;
import com.interviewprep.repository.SessionAnswerRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class TechStackInterviewService {

    private static final Logger log = LoggerFactory.getLogger(TechStackInterviewService.class);

    private final InterviewSessionRecordRepository sessionRepository;
    private final SessionAnswerRepository          answerRepository;
    private final LLMService                       llmService;
    private final ObjectMapper                     objectMapper;

    private final Map<String, TechStackSession> activeSessions = new ConcurrentHashMap<>();

    public TechStackInterviewService(InterviewSessionRecordRepository sessionRepository,
                                      SessionAnswerRepository answerRepository,
                                      LLMService llmService,
                                      ObjectMapper objectMapper) {
        this.sessionRepository = sessionRepository;
        this.answerRepository  = answerRepository;
        this.llmService        = llmService;
        this.objectMapper      = objectMapper;
    }

    // ── Start ─────────────────────────────────────────────────────────────────

    public BotDtos.TechStackStartResponse start(String techStack, UUID userId) {
        log.info("[TECH_STACK] START stack={} userId={}", techStack, userId);

        Map<String, String> firstQ = llmService.generateTechStackQuestion(techStack, List.of(), "Basic");
        String firstQuestion = firstQ.get("question");
        String difficulty    = firstQ.get("difficulty");

        InterviewSessionRecord record = new InterviewSessionRecord();
        record.setId(UUID.randomUUID());
        record.setMode("TECH_STACK");
        record.setTechStack(techStack);
        record.setCompany("General");
        record.setRole(techStack);
        record.setUserId(userId);
        record.setStatus("ACTIVE");
        record.setCurrentQuestion(firstQuestion);
        record.setDepthLevel(0);
        record.setFailureCount(0);
        record.setCreatedAt(LocalDateTime.now());
        sessionRepository.save(record);

        String sessionId = record.getId().toString();
        TechStackSession session = new TechStackSession(sessionId, record.getId(), techStack);
        session.setCurrentQuestion(firstQuestion);
        activeSessions.put(sessionId, session);

        log.info("[TECH_STACK] Session started sessionId={}", sessionId);
        return new BotDtos.TechStackStartResponse(sessionId, techStack, firstQuestion, difficulty);
    }

    // ── Answer ────────────────────────────────────────────────────────────────

    public BotDtos.TechStackAnswerResponse submitAnswer(String sessionId, String answer) {
        TechStackSession session = requireSession(sessionId);
        if (session.isComplete())
            return new BotDtos.TechStackAnswerResponse(sessionId, null, null, true,
                0, "Interview already completed.", "");

        String currentQuestion = session.getCurrentQuestion();

        Map<String, Object> eval = llmService.evaluateTechStackAnswer(
            session.getTechStack(), currentQuestion, answer, session.getHistory());

        double score          = ((Number) eval.get("score")).doubleValue();
        String feedback       = (String) eval.get("feedback");
        String improvedAnswer = (String) eval.get("improved_answer");
        String nextAction     = (String) eval.get("next_action");

        session.addToHistory(currentQuestion, answer, (int) Math.round(score), feedback);
        session.addScore(score);

        // Persist Q&A
        SessionAnswer sa = new SessionAnswer();
        sa.setId(UUID.randomUUID());
        sa.setSessionId(session.getDbSessionId());
        sa.setQuestion(currentQuestion);
        sa.setAnswer(answer);
        sa.setScore((int) Math.round(score));
        sa.setFeedback(feedback);
        sa.setImprovedAnswer(improvedAnswer);
        sa.setFollowup(false);
        sa.setDepthLevel(session.getHistory().size());
        sa.setCreatedAt(LocalDateTime.now());
        answerRepository.save(sa);

        log.info("[TECH_STACK] ANSWER sessionId={} score={} action={}", sessionId, score, nextAction);

        if ("STOP".equals(nextAction) || session.getHistory().size() >= 15) {
            session.setComplete(true);
            persistCurrentQuestion(session, null);
            return new BotDtos.TechStackAnswerResponse(sessionId, null, null, true,
                score, feedback, improvedAnswer);
        }

        // Generate next question with adaptive difficulty
        String currentLevel = computeCurrentLevel(session.getScores());
        Map<String, String> nextQ = llmService.generateTechStackQuestion(
            session.getTechStack(), session.getHistory(), currentLevel);

        session.setCurrentQuestion(nextQ.get("question"));
        persistCurrentQuestion(session, nextQ.get("question"));

        return new BotDtos.TechStackAnswerResponse(sessionId,
            nextQ.get("question"), nextQ.get("difficulty"), false,
            score, feedback, improvedAnswer);
    }

    // ── End ───────────────────────────────────────────────────────────────────

    public BotDtos.TechStackEndResponse end(String sessionId) {
        TechStackSession session = requireSession(sessionId);
        session.setComplete(true);

        log.info("[TECH_STACK] END sessionId={} answers={}", sessionId, session.getHistory().size());
        String rawReport = llmService.generateTechStackFinalReport(
            session.getTechStack(), session.getHistory());

        BotDtos.TechStackEndResponse response = parseFinalReport(
            sessionId, session.getTechStack(), rawReport);

        sessionRepository.findById(session.getDbSessionId()).ifPresent(r -> {
            r.setStatus("COMPLETED");
            r.setCompletedAt(LocalDateTime.now());
            r.setOverallScore(response.overallScore());
            r.setSkillLevel(response.skillLevel());
            r.setOverallFeedback(response.confidenceLevel());
            sessionRepository.save(r);
        });

        activeSessions.remove(sessionId);
        return response;
    }

    // ── Restore from DB ───────────────────────────────────────────────────────

    private TechStackSession requireSession(String sessionId) {
        TechStackSession s = activeSessions.get(sessionId);
        if (s != null) return s;

        log.warn("[TECH_STACK] Session {} not in memory — restoring from DB", sessionId);
        return restoreFromDb(sessionId);
    }

    private TechStackSession restoreFromDb(String sessionId) {
        UUID id = UUID.fromString(sessionId);
        InterviewSessionRecord record = sessionRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Session not found: " + sessionId));

        if ("COMPLETED".equals(record.getStatus()))
            throw new RuntimeException("Session already completed: " + sessionId);

        if (!"TECH_STACK".equals(record.getMode()))
            throw new RuntimeException("Session " + sessionId + " is not a tech stack session");

        // Reload history and scores from session_answers
        List<SessionAnswer> saved = answerRepository.findBySessionIdOrderByCreatedAtAsc(id);

        TechStackSession session = new TechStackSession(sessionId, id, record.getTechStack());
        session.setCurrentQuestion(record.getCurrentQuestion());

        for (SessionAnswer sa : saved) {
            session.addToHistory(
                sa.getQuestion() != null ? sa.getQuestion() : "",
                sa.getAnswer()   != null ? sa.getAnswer()   : "",
                sa.getScore()    != null ? sa.getScore()    : 0,
                sa.getFeedback() != null ? sa.getFeedback() : "");
            if (sa.getScore() != null) session.addScore(sa.getScore().doubleValue());
        }

        activeSessions.put(sessionId, session);
        log.info("[TECH_STACK] Restored session {} history={}", sessionId, saved.size());
        return session;
    }

    private void persistCurrentQuestion(TechStackSession session, String nextQuestion) {
        sessionRepository.findById(session.getDbSessionId()).ifPresent(r -> {
            r.setCurrentQuestion(nextQuestion);
            sessionRepository.save(r);
        });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String computeCurrentLevel(List<Double> scores) {
        if (scores.isEmpty()) return "Basic";
        double avg = scores.stream().mapToDouble(Double::doubleValue).average().orElse(5);
        if (avg >= 8) return "Advanced";
        if (avg >= 6) return "Intermediate";
        return "Basic";
    }

    private BotDtos.TechStackEndResponse parseFinalReport(String sessionId, String techStack, String json) {
        try {
            String cleaned = extractJson(json, '{', '}');
            JsonNode node = objectMapper.readTree(cleaned);
            List<String> strengths   = new ArrayList<>(); node.path("strengths").forEach(s -> strengths.add(s.asText()));
            List<String> weaknesses  = new ArrayList<>(); node.path("weaknesses").forEach(w -> weaknesses.add(w.asText()));
            List<String> improvement = new ArrayList<>(); node.path("improvement_areas").forEach(a -> improvement.add(a.asText()));
            List<String> topics      = new ArrayList<>(); node.path("suggested_topics").forEach(t -> topics.add(t.asText()));
            return new BotDtos.TechStackEndResponse(sessionId, techStack,
                node.path("overall_score").asDouble(5),
                node.path("skill_level").asText("Intermediate"),
                strengths, weaknesses, improvement, topics,
                node.path("confidence_level").asText("Developing"));
        } catch (Exception e) {
            log.error("[TECH_STACK] Final report parse failed: {}", e.getMessage());
            return new BotDtos.TechStackEndResponse(sessionId, techStack, 5.0, "Intermediate",
                List.of(), List.of("Could not parse evaluation."), List.of(), List.of(), "Developing");
        }
    }

    private String extractJson(String text, char open, char close) {
        int s = text.indexOf(open), e = text.lastIndexOf(close) + 1;
        return (s >= 0 && e > s) ? text.substring(s, e) : text;
    }

    // ── Session model ─────────────────────────────────────────────────────────

    static class TechStackSession {
        private final String sessionId;
        private final UUID   dbSessionId;
        private final String techStack;
        private String  currentQuestion;
        private boolean complete = false;
        private final List<Map<String, String>> history = new ArrayList<>();
        private final List<Double> scores = new ArrayList<>();

        TechStackSession(String sessionId, UUID dbSessionId, String techStack) {
            this.sessionId   = sessionId;
            this.dbSessionId = dbSessionId;
            this.techStack   = techStack;
        }

        public String getSessionId()              { return sessionId; }
        public UUID   getDbSessionId()            { return dbSessionId; }
        public String getTechStack()              { return techStack; }
        public String getCurrentQuestion()        { return currentQuestion; }
        public void   setCurrentQuestion(String q){ this.currentQuestion = q; }
        public boolean isComplete()               { return complete; }
        public void    setComplete(boolean v)     { this.complete = v; }
        public List<Map<String, String>> getHistory(){ return history; }
        public List<Double> getScores()           { return scores; }
        public void addScore(double s)            { scores.add(s); }

        public void addToHistory(String q, String a, int score, String fb) {
            Map<String, String> e = new LinkedHashMap<>();
            e.put("question", q); e.put("answer", a);
            e.put("score", String.valueOf(score)); e.put("feedback", fb);
            history.add(e);
        }
    }
}
