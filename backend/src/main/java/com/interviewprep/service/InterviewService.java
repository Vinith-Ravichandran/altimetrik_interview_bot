package com.interviewprep.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.interviewprep.domain.*;
import com.interviewprep.repository.AccountRepository;
import com.interviewprep.repository.AppUserRepository;
import com.interviewprep.repository.BotQuestionRepository;
import com.interviewprep.repository.InterviewSessionRepository;
import com.interviewprep.repository.QuestionRepository;
import com.interviewprep.repository.RoleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class InterviewService {

    private static final Logger log = LoggerFactory.getLogger(InterviewService.class);

    private final InterviewSessionRepository sessionRepository;
    private final QuestionRepository         questionRepository;
    private final AccountRepository          accountRepository;
    private final RoleRepository             roleRepository;
    private final AppUserRepository          userRepository;
    private final BotQuestionRepository      botQuestionRepository;
    private final ClaudeService              claudeService;
    private final VectorSearchService        vectorSearchService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public InterviewService(InterviewSessionRepository sessionRepository,
                            QuestionRepository questionRepository,
                            AccountRepository accountRepository,
                            RoleRepository roleRepository,
                            AppUserRepository userRepository,
                            BotQuestionRepository botQuestionRepository,
                            ClaudeService claudeService,
                            VectorSearchService vectorSearchService) {
        this.sessionRepository   = sessionRepository;
        this.questionRepository  = questionRepository;
        this.accountRepository   = accountRepository;
        this.roleRepository      = roleRepository;
        this.userRepository      = userRepository;
        this.botQuestionRepository = botQuestionRepository;
        this.claudeService       = claudeService;
        this.vectorSearchService = vectorSearchService;
    }

    @Transactional
    public InterviewSession start(UUID accountId, UUID roleId, String callerName) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new IllegalArgumentException("Account not found"));
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new IllegalArgumentException("Role not found"));

        InterviewSession session = new InterviewSession();
        session.setAccount(account);
        session.setRole(role);
        // callerName is the JWT subject = user UUID string
        if (callerName != null) {
            try {
                UUID uid = UUID.fromString(callerName);
                userRepository.findById(uid).ifPresent(session::setUser);
            } catch (IllegalArgumentException e) {
                userRepository.findByName(callerName).ifPresent(session::setUser);
            }
        }
        sessionRepository.save(session);

        Question first = generateNextQuestion(session);
        session.getQuestions().add(first);
        return session;
    }

    @Transactional
    public Question generateNextQuestion(InterviewSession session) {
        String roleName    = session.getRole().getName();
        String accountName = session.getAccount().getName();

        Set<String> alreadyAsked = session.getQuestions().stream()
                .map(Question::getText)
                .collect(Collectors.toSet());

        // ── Priority 1: questions from PostgreSQL (uploaded documents) ──────────
        String questionText = pickFromDatabase(accountName, roleName, alreadyAsked);

        // ── Priority 2: Claude-generated question (fallback) ───────────────────
        if (questionText == null) {
            log.info("[INTERVIEW] No DB questions available — generating via Claude for role={}", roleName);
            questionText = generateViaClaude(session, roleName, accountName, alreadyAsked);
        } else {
            log.info("[INTERVIEW] Using question from PostgreSQL for account={} role={}", accountName, roleName);
        }

        Question q = new Question();
        q.setSession(session);
        q.setOrderIndex(session.getQuestions().size());
        q.setText(questionText);
        return questionRepository.save(q);
    }

    /** Picks one unasked question from interview_bot.questions matching account+role. */
    private String pickFromDatabase(String accountName, String roleName, Set<String> alreadyAsked) {
        // Try exact account + role match first
        List<BotQuestion> pool = botQuestionRepository.findByCompanyAndRole(accountName, roleName);

        // Fall back to role-only match (questions tagged with any account)
        if (pool.isEmpty()) {
            pool = botQuestionRepository.findByRole(roleName);
        }

        return pool.stream()
                .filter(q -> !alreadyAsked.contains(q.getContent()))
                .map(BotQuestion::getContent)
                .findFirst()
                .orElse(null);
    }

    private String generateViaClaude(InterviewSession session, String roleName,
                                     String accountName, Set<String> alreadyAsked) {
        String context = vectorSearchService.search(roleName, 5).stream()
                .map(DocumentChunk::getText)
                .collect(Collectors.joining("\n---\n"));

        String askedSoFar = String.join("\n- ", alreadyAsked);

        String system = "You are an expert technical interviewer. Generate ONE clear, role-appropriate interview question. Return only the question text, no preamble.";
        String user = """
                Role: %s
                Account: %s
                Reference material (may be empty): %s
                Already asked: %s
                Generate the next unique question for this role. Avoid duplicates.
                """.formatted(roleName, accountName,
                context.isBlank() ? "(none)" : context,
                askedSoFar.isBlank() ? "(none)" : askedSoFar);

        return claudeService.complete(system, user).trim();
    }

    @Transactional
    public Answer submitAnswer(UUID questionId, String answerText) {
        Question q = questionRepository.findById(questionId)
                .orElseThrow(() -> new IllegalArgumentException("Question not found"));

        Answer answer = new Answer();
        answer.setQuestion(q);
        answer.setText(answerText);
        q.setAnswer(answer);

        Evaluation evaluation = evaluate(q.getText(), answerText);
        evaluation.setAnswer(answer);
        answer.setEvaluation(evaluation);

        questionRepository.save(q);
        return answer;
    }

    private Evaluation evaluate(String questionText, String answerText) {
        String system = """
                You are an expert interview evaluator. Score the candidate's answer on three axes from 0.0 to 10.0.
                Return STRICTLY a JSON object: {"clarity": x, "depth": x, "quality": x, "strengths": "...", "improvements": "..."}.
                """;
        String user = "Question:\n" + questionText + "\n\nAnswer:\n" + answerText;
        String raw = claudeService.complete(system, user);

        Evaluation eval = new Evaluation();
        try {
            String json = extractJson(raw);
            JsonNode node = objectMapper.readTree(json);
            eval.setClarity(node.path("clarity").asDouble(0));
            eval.setDepth(node.path("depth").asDouble(0));
            eval.setQuality(node.path("quality").asDouble(0));
            eval.setOverall((eval.getClarity() + eval.getDepth() + eval.getQuality()) / 3.0);
            eval.setStrengths(node.path("strengths").asText(""));
            eval.setImprovements(node.path("improvements").asText(""));
        } catch (Exception e) {
            eval.setClarity(0);
            eval.setDepth(0);
            eval.setQuality(0);
            eval.setOverall(0);
            eval.setStrengths("");
            eval.setImprovements("Could not parse evaluation: " + raw);
        }
        return eval;
    }

    private String extractJson(String raw) {
        int start = raw.indexOf('{');
        int end = raw.lastIndexOf('}');
        if (start >= 0 && end > start) return raw.substring(start, end + 1);
        return "{}";
    }

    @Transactional
    public InterviewSession finish(UUID sessionId) {
        InterviewSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found"));

        List<Evaluation> evals = session.getQuestions().stream()
                .map(Question::getAnswer)
                .filter(a -> a != null && a.getEvaluation() != null)
                .map(Answer::getEvaluation)
                .toList();

        double avg = evals.isEmpty() ? 0 : evals.stream().mapToDouble(Evaluation::getOverall).average().orElse(0);
        String strengths = evals.stream().map(Evaluation::getStrengths).filter(s -> s != null && !s.isBlank())
                .collect(Collectors.joining(" | "));
        String improvements = evals.stream().map(Evaluation::getImprovements).filter(s -> s != null && !s.isBlank())
                .collect(Collectors.joining(" | "));

        session.setOverallScore(avg);
        session.setOverallFeedback("Strengths: " + strengths + "\nImprovements: " + improvements);
        session.setCompletedAt(Instant.now());
        return session;
    }

    public InterviewSession get(UUID id) {
        return sessionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Session not found"));
    }

    /** Returns all sessions — admin only. */
    public List<InterviewSession> list() {
        return sessionRepository.findAll();
    }

    /** Returns only sessions belonging to the given user. */
    public List<InterviewSession> listByUser(UUID userId) {
        return sessionRepository.findByUser_Id(userId);
    }
}
