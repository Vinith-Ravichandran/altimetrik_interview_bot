package com.interviewprep.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

/**
 * LLM service backed by OpenAI Chat Completions API.
 * Kept as "ClaudeService" to avoid renaming all injection points.
 *
 * Set OPENAI_API_KEY environment variable to enable AI features.
 * Without it the app runs but returns stub responses.
 */
@Service
public class ClaudeService {

    private static final Logger log = LoggerFactory.getLogger(ClaudeService.class);

    private final RestClient   restClient;
    private final ObjectMapper mapper = new ObjectMapper();

    @Value("${openai.api-key:}")
    private String apiKey;

    @Value("${openai.model:gpt-4o-mini}")
    private String model;

    @Value("${openai.base-url:https://api.openai.com}")
    private String baseUrl;

    @Value("${openai.max-tokens:2048}")
    private int maxTokens;

    public ClaudeService(RestClient restClient) {
        this.restClient = restClient;
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    /**
     * Send a system + user prompt and return the assistant reply text.
     *
     * @param systemPrompt instruction for the model (may be null/blank)
     * @param userPrompt   the actual user message
     * @return reply string, or a stub message if not configured
     */
    public String complete(String systemPrompt, String userPrompt) {
        if (!isConfigured()) {
            log.warn("OpenAI API key not configured — returning stub response");
            return "[OpenAI API not configured. Set OPENAI_API_KEY environment variable.]";
        }

        // Build OpenAI Chat Completions request body
        ObjectNode body = mapper.createObjectNode();
        body.put("model", model);
        body.put("max_tokens", maxTokens);

        ArrayNode messages = body.putArray("messages");

        if (systemPrompt != null && !systemPrompt.isBlank()) {
            ObjectNode sys = messages.addObject();
            sys.put("role", "system");
            sys.put("content", systemPrompt);
        }

        ObjectNode user = messages.addObject();
        user.put("role", "user");
        user.put("content", userPrompt);

        try {
            JsonNode response = restClient.post()
                    .uri(baseUrl + "/v1/chat/completions")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class);

            if (response == null) return "";

            // Response: choices[0].message.content
            JsonNode choices = response.path("choices");
            if (choices.isArray() && !choices.isEmpty()) {
                return choices.get(0).path("message").path("content").asText("").trim();
            }
            return "";

        } catch (Exception e) {
            log.error("OpenAI API call failed: {}", e.getMessage());
            return "[OpenAI API error: " + e.getMessage() + "]";
        }
    }
}
