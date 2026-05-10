package com.interviewprep.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.interviewprep.dto.CategorizedQuestion;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

import java.util.Collections;
import java.util.List;

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
     */
    public String complete(String systemPrompt, String userPrompt) {
        if (!isConfigured()) {
            log.warn("[LLM] OpenAI API key not configured — returning stub. Set OPENAI_API_KEY.");
            return "[OpenAI API not configured. Set OPENAI_API_KEY environment variable.]";
        }

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

        log.debug("[LLM] Calling OpenAI model={} maxTokens={} promptLen={}", model, maxTokens, userPrompt.length());

        try {
            JsonNode response = restClient.post()
                    .uri(baseUrl + "/v1/chat/completions")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class);

            if (response == null) {
                log.error("[LLM] OpenAI returned null response");
                return "";
            }

            JsonNode choices = response.path("choices");
            if (choices.isArray() && !choices.isEmpty()) {
                String content = choices.get(0).path("message").path("content").asText("").trim();
                log.debug("[LLM] OpenAI response received, length={}", content.length());
                return content;
            }

            log.warn("[LLM] OpenAI response had no choices: {}", response);
            return "";

        } catch (HttpClientErrorException e) {
            String reason = classifyOpenAiClientError(e);
            log.error("[LLM] OpenAI client error {}: {}", e.getStatusCode(), reason);
            throw new RuntimeException("OpenAI API error: " + reason, e);

        } catch (HttpServerErrorException e) {
            log.error("[LLM] OpenAI server error {}: {}", e.getStatusCode(), e.getMessage());
            throw new RuntimeException("OpenAI server error — please retry", e);

        } catch (ResourceAccessException e) {
            log.error("[LLM] OpenAI connection timeout/unreachable: {}", e.getMessage());
            throw new RuntimeException("OpenAI API timeout — check network or retry", e);

        } catch (Exception e) {
            log.error("[LLM] Unexpected OpenAI failure: {}", e.getMessage(), e);
            return "[OpenAI API error: " + e.getMessage() + "]";
        }
    }

    public List<CategorizedQuestion> extractCategorizedQuestions(String combinedText) {
        if (combinedText == null || combinedText.isBlank()) {
            log.warn("[LLM] EXTRACTION skipped — combined text is empty");
            return Collections.emptyList();
        }

        if (!isConfigured()) {
            log.error("[LLM] EXTRACTION failed — OpenAI API key not configured. Set OPENAI_API_KEY env var.");
            return Collections.emptyList();
        }

        log.info("[LLM] EXTRACTION starting — input text length={} chars", combinedText.length());

        String system = """
            You are an expert at extracting interview questions from documents.
            Extract ONLY interview questions — no answers, no explanations, no noise.
            Normalize wording for clarity and completeness.
            Categorize each question as exactly one of: SQL, Python, Java, BigQuery, GCS, Others.
            Return ONLY a valid JSON array with no markdown, no extra text:
            [{"question":"...","category":"SQL"},...]
            """;

        String text = combinedText.length() > 12000
            ? combinedText.substring(0, 12000)
            : combinedText;

        if (combinedText.length() > 12000) {
            log.debug("[LLM] EXTRACTION input truncated from {} to 12000 chars", combinedText.length());
        }

        String raw = complete(system, "Extract all interview questions from this text:\n\n" + text);
        log.debug("[LLM] EXTRACTION raw response (first 300 chars): {}",
            raw.length() > 300 ? raw.substring(0, 300) : raw);

        try {
            String json = raw
                .replaceAll("(?s)```json\\s*", "")
                .replaceAll("(?s)```\\s*", "")
                .trim();
            int start = json.indexOf('[');
            int end   = json.lastIndexOf(']');

            if (start < 0 || end < 0 || end <= start) {
                log.error("[LLM] EXTRACTION — no JSON array in response. Raw: {}", raw);
                return Collections.emptyList();
            }

            List<CategorizedQuestion> result = mapper.readValue(
                json.substring(start, end + 1),
                new TypeReference<List<CategorizedQuestion>>() {}
            );
            log.info("[LLM] EXTRACTION complete — {} questions parsed", result.size());
            return result;

        } catch (Exception e) {
            log.error("[LLM] EXTRACTION — JSON parse failed: {} | raw: {}", e.getMessage(), raw);
            return Collections.emptyList();
        }
    }

    private String classifyOpenAiClientError(HttpClientErrorException e) {
        return switch (e.getStatusCode().value()) {
            case 401 -> "Invalid API key — verify your OPENAI_API_KEY";
            case 403 -> "API key lacks permission for this request";
            case 429 -> "Rate limit exceeded — reduce request frequency or upgrade plan";
            case 400 -> "Bad request: " + e.getResponseBodyAsString();
            default  -> e.getMessage();
        };
    }
}
