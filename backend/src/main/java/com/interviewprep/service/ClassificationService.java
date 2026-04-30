package com.interviewprep.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

@Service
public class ClassificationService {

    private final ClaudeService claudeService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ClassificationService(ClaudeService claudeService) {
        this.claudeService = claudeService;
    }

    public Classification classify(String questionText) {
        String system = """
                You classify interview questions. Return STRICT JSON:
                {"domain": "<top-level domain like GCP, AWS, Java, React, SQL, System Design>",
                 "service": "<specific service or topic, e.g. BigQuery, S3, Spring Boot>",
                 "difficulty": "<easy|medium|hard>"}
                """;
        String raw = claudeService.complete(system, questionText);
        try {
            int s = raw.indexOf('{');
            int e = raw.lastIndexOf('}');
            if (s < 0 || e <= s) return defaultClassification();
            JsonNode node = objectMapper.readTree(raw.substring(s, e + 1));
            return new Classification(
                    node.path("domain").asText("general"),
                    node.path("service").asText(""),
                    node.path("difficulty").asText("medium")
            );
        } catch (Exception ex) {
            return defaultClassification();
        }
    }

    private Classification defaultClassification() {
        return new Classification("general", "", "medium");
    }

    public record Classification(String domain, String service, String difficulty) {}
}
