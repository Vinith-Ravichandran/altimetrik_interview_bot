package com.interviewprep.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.interviewprep.dto.BotDtos;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * LLM orchestration service — delegates all API calls to ClaudeService
 * which is backed by OpenAI (gpt-4o-mini) and uses OPENAI_API_KEY.
 */
@Service
public class LLMService {

    private static final Logger log = LoggerFactory.getLogger(LLMService.class);

    private final ClaudeService openAiClient;
    private final ObjectMapper  objectMapper;

    public LLMService(ClaudeService openAiClient, ObjectMapper objectMapper) {
        this.openAiClient = openAiClient;
        this.objectMapper = objectMapper;
    }

    // ── Mode 1: extract questions from text ──────────────────────────────────

    public List<BotDtos.ExtractedQuestion> extractQuestions(String text) {
        log.info("[LLM] EXTRACTION starting — input length={}", text.length());
        String prompt = """
            Extract all interview questions from the text below.
            Return ONLY a JSON array, no explanation, no markdown:
            [{"question":"...","category":"...","difficulty":"Easy|Medium|Hard"}]
            Text:
            """ + text;
        List<BotDtos.ExtractedQuestion> questions = parseExtractedQuestions(callClaude(prompt, "EXTRACTION"));
        log.info("[LLM] EXTRACTION complete — {} questions", questions.size());
        return questions;
    }

    // ── Mode 1: detailed evaluation with improved answer ─────────────────────

    public BotDtos.DetailedEvaluationResult evaluateDetailed(
            String currentQuestion, String candidateAnswer,
            List<Map<String, String>> history, int depthLevel) {

        log.info("[LLM] DETAILED_EVAL — depthLevel={} answerLen={}", depthLevel, candidateAnswer.length());

        StringBuilder historyBlock = new StringBuilder();
        for (int i = 0; i < history.size(); i++) {
            Map<String, String> h = history.get(i);
            historyBlock.append("[Turn ").append(i + 1).append("]\n");
            historyBlock.append("Q: ").append(h.get("question")).append("\n");
            historyBlock.append("A: ").append(h.get("answer")).append("\n");
            historyBlock.append("Score: ").append(h.get("score")).append("/10\n\n");
        }

        String prompt = """
            You are a senior technical interviewer evaluating a candidate's answer.

            === CONVERSATION HISTORY ===
            %s
            === CURRENT TURN ===
            Question: %s
            Candidate's Answer: %s
            Depth Level: %d / 3

            === TASK ===
            1. Score on 3 dimensions (0.0–10.0 each) AND justify each score:
               - clarity (0-10): how clearly the answer is communicated
                 → clarity_justification: exactly WHY this clarity score was given
               - depth (0-10): technical accuracy and completeness
                 → depth_justification: exactly WHY this depth score was given
               - quality (0-10): structure, examples, completeness
                 → quality_justification: exactly WHY this quality score was given

            2. Determine next action:
               - Score 0–3: next_action = "NEXT_QUESTION"
               - Score 4–5: next_action = "FOLLOW_UP" (needs clarification)
               - Score 6–7: next_action = "FOLLOW_UP" (ask for deeper insight)
               - Score 8–10: next_action = "FOLLOW_UP" (challenge with edge case)
               - If depth_level >= 3: always next_action = "NEXT_QUESTION"

            3. Write a professional improved_answer that would impress a senior interviewer —
               show how to answer this question like an experienced professional.

            4. Write a brief overall feedback summary.

            Return ONLY valid JSON:
            {
              "clarity": 7.0,
              "clarity_justification": "Your explanation was mostly clear but lacked structure. You jumped between points without transitions, making it slightly hard to follow.",
              "depth": 6.0,
              "depth_justification": "You covered the basic concept but missed key technical details such as time complexity and edge cases.",
              "quality": 7.5,
              "quality_justification": "Good use of a real-world example. However, the answer could be improved with a concrete code snippet or diagram reference.",
              "overall": 6.8,
              "feedback": "Solid foundation, but needs more technical depth and structured delivery.",
              "improved_answer": "A professional answer would begin by defining the concept, then explain how it works with a concrete example, discuss trade-offs, and mention when to use it...",
              "next_action": "FOLLOW_UP or NEXT_QUESTION",
              "next_question": "follow-up question text, or null if NEXT_QUESTION"
            }
            """.formatted(historyBlock, currentQuestion, candidateAnswer, depthLevel);

        String response = callClaude(prompt, "DETAILED_EVAL");
        BotDtos.DetailedEvaluationResult result = parseDetailedEvaluation(response);
        log.info("[LLM] DETAILED_EVAL complete — overall={} nextAction={}", result.overall(), result.nextAction());
        return result;
    }

    // ── Mode 1: final report ─────────────────────────────────────────────────

    public BotDtos.EvaluationResult evaluateAndFollowUp(
            String currentQuestion, String candidateAnswer,
            List<Map<String, String>> history, int depthLevel) {
        BotDtos.DetailedEvaluationResult d =
            evaluateDetailed(currentQuestion, candidateAnswer, history, depthLevel);
        return new BotDtos.EvaluationResult(
            (int) Math.round(d.overall()), d.feedback(), d.nextAction(), d.nextQuestion());
    }

    public String generateFinalReport(List<Map<String, String>> history) {
        log.info("[LLM] FINAL_REPORT — historySize={}", history.size());
        StringBuilder conversation = new StringBuilder();
        for (int i = 0; i < history.size(); i++) {
            Map<String, String> h = history.get(i);
            conversation.append("[Q").append(i + 1).append("] ").append(h.get("question")).append("\n");
            conversation.append("Answer: ").append(h.get("answer")).append("\n");
            conversation.append("Score: ").append(h.get("score")).append("/10\n\n");
        }
        String prompt = """
            You are a senior technical interviewer. Evaluate the complete mock interview.

            === FULL INTERVIEW ===
            %s
            === TASK ===
            Provide a comprehensive evaluation. Return ONLY valid JSON:
            {
              "overall_score": 7.0,
              "skill_level": "Beginner|Intermediate|Advanced",
              "strengths": ["..."],
              "weaknesses": ["..."],
              "category_analysis": [
                {"category":"SQL","score":7,"level":"Intermediate"}
              ]
            }
            """.formatted(conversation);
        String raw = callClaude(prompt, "FINAL_REPORT");
        log.info("[LLM] FINAL_REPORT complete");
        return raw;
    }

    // ── Mode 2: tech stack evaluation ────────────────────────────────────────

    public Map<String, String> generateTechStackQuestion(
            String techStack, List<Map<String, String>> history, String currentLevel) {

        log.info("[LLM] TECH_QUESTION — stack={} level={} history={}", techStack, currentLevel, history.size());

        StringBuilder historyBlock = new StringBuilder();
        for (Map<String, String> h : history) {
            historyBlock.append("Q: ").append(h.get("question")).append("\n");
            historyBlock.append("A: ").append(h.get("answer")).append("\n");
            historyBlock.append("Score: ").append(h.get("score")).append("/10\n\n");
        }

        String prompt = """
            You are conducting a technical evaluation for: %s
            Current difficulty level: %s

            === PREVIOUS Q&A ===
            %s
            === TASK ===
            Generate the NEXT interview question. Rules:
            - If history is empty: start with Basic/Fundamental questions
            - Increase difficulty based on previous answer scores
            - Cover different aspects of %s (don't repeat topics)
            - Progress: Basic → Intermediate → Advanced as scores improve
            - If candidate scores < 5 consistently: stay at same level

            Return ONLY valid JSON:
            {"question": "...", "difficulty": "Basic|Intermediate|Advanced", "topic": "..."}
            """.formatted(techStack, currentLevel, historyBlock, techStack);

        try {
            String response = callClaude(prompt, "TECH_QUESTION");
            String json = extractJson(response, '{', '}');
            JsonNode node = objectMapper.readTree(json);
            return Map.of(
                "question",   node.path("question").asText("Tell me about " + techStack),
                "difficulty", node.path("difficulty").asText("Basic"),
                "topic",      node.path("topic").asText(techStack)
            );
        } catch (Exception e) {
            log.error("[LLM] TECH_QUESTION parse failed: {}", e.getMessage());
            return Map.of("question", "Explain the core concepts of " + techStack,
                          "difficulty", "Basic", "topic", techStack);
        }
    }

    public Map<String, Object> evaluateTechStackAnswer(
            String techStack, String question, String answer,
            List<Map<String, String>> history) {

        log.info("[LLM] TECH_EVAL — stack={} answerLen={}", techStack, answer.length());

        String prompt = """
            You are evaluating a candidate's knowledge of: %s

            Question: %s
            Candidate's Answer: %s

            === TASK ===
            1. Score the answer (0–10)
            2. Decide whether to continue (CONTINUE) or stop (STOP if user clearly answered all aspects)
            3. Write brief feedback
            4. Write a professional improved answer for this question

            Return ONLY valid JSON:
            {
              "score": 7,
              "feedback": "...",
              "improved_answer": "A strong answer would be: ...",
              "next_action": "CONTINUE or STOP"
            }
            """.formatted(techStack, question, answer);

        try {
            String response = callClaude(prompt, "TECH_EVAL");
            String json = extractJson(response, '{', '}');
            JsonNode node = objectMapper.readTree(json);
            return Map.of(
                "score",          node.path("score").asDouble(5),
                "feedback",       node.path("feedback").asText(""),
                "improved_answer",node.path("improved_answer").asText(""),
                "next_action",    node.path("next_action").asText("CONTINUE")
            );
        } catch (Exception e) {
            log.error("[LLM] TECH_EVAL parse failed: {}", e.getMessage());
            return Map.of("score", 5.0, "feedback", "Could not evaluate.",
                          "improved_answer", "", "next_action", "CONTINUE");
        }
    }

    public String generateTechStackFinalReport(String techStack, List<Map<String, String>> history) {
        log.info("[LLM] TECH_FINAL_REPORT — stack={} answers={}", techStack, history.size());

        StringBuilder conversation = new StringBuilder();
        for (int i = 0; i < history.size(); i++) {
            Map<String, String> h = history.get(i);
            conversation.append("[Q").append(i + 1).append("]\n");
            conversation.append("Question: ").append(h.get("question")).append("\n");
            conversation.append("Answer: ").append(h.get("answer")).append("\n");
            conversation.append("Score: ").append(h.get("score")).append("/10\n\n");
        }

        String prompt = """
            You are a senior %s expert evaluating a candidate's complete technical assessment.

            === FULL INTERVIEW ===
            %s
            === TASK ===
            Provide a comprehensive skill assessment. Return ONLY valid JSON:
            {
              "overall_score": 7.5,
              "skill_level": "Beginner|Intermediate|Advanced|Expert",
              "confidence_level": "e.g. Confident in core concepts, needs practice in advanced topics",
              "strengths": ["specific strength 1", "specific strength 2"],
              "weaknesses": ["specific gap 1", "specific gap 2"],
              "improvement_areas": ["area 1", "area 2"],
              "suggested_topics": ["topic 1", "topic 2", "topic 3"]
            }
            """.formatted(techStack, conversation);

        return callClaude(prompt, "TECH_FINAL_REPORT");
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /** Delegates to OpenAI via ClaudeService (which holds OPENAI_API_KEY). */
    private String callClaude(String userMessage, String requestType) {
        log.debug("[LLM] {} → OpenAI promptLen={}", requestType, userMessage.length());
        String response = openAiClient.complete(null, userMessage);
        if (response == null || response.isBlank()) {
            throw new RuntimeException("OpenAI returned empty response for " + requestType);
        }
        log.debug("[LLM] {} response length={}", requestType, response.length());
        return response;
    }

    private List<BotDtos.ExtractedQuestion> parseExtractedQuestions(String json) {
        try {
            String cleaned = extractJson(json, '[', ']');
            JsonNode array = objectMapper.readTree(cleaned);
            List<BotDtos.ExtractedQuestion> questions = new ArrayList<>();
            for (JsonNode node : array) {
                questions.add(new BotDtos.ExtractedQuestion(
                    node.path("question").asText(),
                    node.path("category").asText("General"),
                    node.path("difficulty").asText("Medium")
                ));
            }
            return questions;
        } catch (Exception e) {
            log.error("[LLM] EXTRACTION parse failed: {}", e.getMessage());
            throw new RuntimeException("Failed to parse extracted questions", e);
        }
    }

    private BotDtos.DetailedEvaluationResult parseDetailedEvaluation(String json) {
        try {
            String cleaned = extractJson(json, '{', '}');
            JsonNode node = objectMapper.readTree(cleaned);
            String nq = node.path("next_question").isNull() ? null : node.path("next_question").asText(null);
            return new BotDtos.DetailedEvaluationResult(
                node.path("clarity").asDouble(5),
                node.path("clarity_justification").asText(""),
                node.path("depth").asDouble(5),
                node.path("depth_justification").asText(""),
                node.path("quality").asDouble(5),
                node.path("quality_justification").asText(""),
                node.path("overall").asDouble(5),
                node.path("feedback").asText(""),
                node.path("improved_answer").asText(""),
                node.path("next_action").asText("NEXT_QUESTION"),
                (nq == null || nq.isBlank()) ? null : nq
            );
        } catch (Exception e) {
            log.error("[LLM] DETAILED_EVAL parse failed: {}", e.getMessage());
            return new BotDtos.DetailedEvaluationResult(
                5, "Could not evaluate clarity.",
                5, "Could not evaluate depth.",
                5, "Could not evaluate quality.",
                5, "Could not evaluate answer.", "", "NEXT_QUESTION", null);
        }
    }

    private String extractJson(String text, char open, char close) {
        int start = text.indexOf(open);
        int end   = text.lastIndexOf(close) + 1;
        if (start >= 0 && end > start) return text.substring(start, end);
        return text;
    }
}
