package com.interviewprep.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.interviewprep.domain.*;
import com.interviewprep.repository.AccountRepository;
import com.interviewprep.repository.InterviewSessionRepository;
import com.interviewprep.repository.QuestionRepository;
import com.interviewprep.repository.RoleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class InterviewService {

    private final InterviewSessionRepository sessionRepository;
    private final QuestionRepository questionRepository;
    private final AccountRepository accountRepository;
    private final RoleRepository roleRepository;
    private final ClaudeService claudeService;
    private final VectorSearchService vectorSearchService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public InterviewService(InterviewSessionRepository sessionRepository,
                            QuestionRepository questionRepository,
                            AccountRepository accountRepository,
                            RoleRepository roleRepository,
                            ClaudeService claudeService,
                            VectorSearchService vectorSearchService) {
        this.sessionRepository = sessionRepository;
        this.questionRepository = questionRepository;
        this.accountRepository = accountRepository;
        this.roleRepository = roleRepository;
        this.claudeService = claudeService;
        this.vectorSearchService = vectorSearchService;
    }

    @Transactional
    public InterviewSession start(UUID accountId, UUID roleId) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new IllegalArgumentException("Account not found"));
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new IllegalArgumentException("Role not found"));

        InterviewSession session = new InterviewSession();
        session.setAccount(account);
        session.setRole(role);
        sessionRepository.save(session);

        Question first = generateNextQuestion(session);
        session.getQuestions().add(first);
        return session;
    }

    @Transactional
    public Question generateNextQuestion(InterviewSession session) {
        String roleName = session.getRole().getName();

        String context = vectorSearchService.search(roleName, 5).stream()
                .map(DocumentChunk::getText)
                .collect(Collectors.joining("\n---\n"));

        String askedSoFar = session.getQuestions().stream()
                .map(Question::getText)
                .collect(Collectors.joining("\n- "));

        String system = "You are an expert technical interviewer. Generate ONE clear, role-appropriate interview question. Return only the question text, no preamble.";
        String user = """
                Role: %s
                Account: %s

                Reference material from study materials (may be empty):
                %s

                Already asked:
                - %s

                Generate the next unique question for this role. Avoid duplicates.
                """.formatted(
                roleName,
                session.getAccount().getName(),
                context.isBlank() ? "(none)" : context,
                askedSoFar.isBlank() ? "(none)" : askedSoFar);

        String text = claudeService.complete(system, user).trim();

        Question q = new Question();
        q.setSession(session);
        q.setOrderIndex(session.getQuestions().size());
        q.setText(text);
        return questionRepository.save(q);
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

    public List<InterviewSession> list() {
        return sessionRepository.findAll();
    }
}
