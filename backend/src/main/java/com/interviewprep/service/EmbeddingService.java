package com.interviewprep.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.UUID;

/**
 * Generates dense vector embeddings using OpenAI Embeddings API.
 * Model: text-embedding-3-small → 1536 dimensions (matches pgvector column).
 *
 * Falls back to null (keyword search) when OPENAI_API_KEY is not set.
 */
@Service
public class EmbeddingService {

    private static final Logger log = LoggerFactory.getLogger(EmbeddingService.class);
    private static final int DIMS = 1536;

    private final RestClient   restClient;
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper = new ObjectMapper();

    @Value("${openai.api-key:}")
    private String apiKey;

    @Value("${openai.embedding-model:text-embedding-3-small}")
    private String model;

    @Value("${openai.base-url:https://api.openai.com}")
    private String baseUrl;

    public EmbeddingService(RestClient restClient, JdbcTemplate jdbc) {
        this.restClient = restClient;
        this.jdbc       = jdbc;
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    /**
     * Embed a single text string.
     *
     * @return float[1536], or null if not configured / call fails (triggers keyword fallback).
     */
    public float[] embed(String text) {
        if (!isConfigured() || text == null || text.isBlank()) return null;

        try {
            ObjectNode body = mapper.createObjectNode();
            body.put("model", model);
            ArrayNode input = body.putArray("input");
            input.add(truncate(text, 8000)); // OpenAI max ~8191 tokens for small model

            JsonNode response = restClient.post()
                    .uri(baseUrl + "/v1/embeddings")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class);

            if (response == null) return null;

            // Response: data[0].embedding[]
            JsonNode embNode = response.path("data").path(0).path("embedding");
            if (!embNode.isArray() || embNode.isEmpty()) return null;

            float[] vec = new float[DIMS];
            for (int i = 0; i < Math.min(embNode.size(), DIMS); i++) {
                vec[i] = (float) embNode.get(i).asDouble();
            }
            return vec;

        } catch (Exception e) {
            log.error("OpenAI embedding failed: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Persist an embedding for a document chunk via native JDBC.
     * PostgreSQL + pgvector only — silently ignored on H2.
     */
    public void storeEmbedding(UUID chunkId, float[] embedding) {
        if (embedding == null || chunkId == null) return;
        try {
            jdbc.update(
                "UPDATE document_chunks SET embedding = ?::vector WHERE id = ?",
                toVectorString(embedding),
                chunkId
            );
        } catch (Exception e) {
            log.warn("storeEmbedding skipped for chunk {} (pgvector not active): {}", chunkId, e.getMessage());
        }
    }

    /** Format float[] as pgvector literal: [0.1,0.2,...] */
    public static String toVectorString(float[] vec) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < vec.length; i++) {
            if (i > 0) sb.append(",");
            sb.append(vec[i]);
        }
        return sb.append("]").toString();
    }

    private String truncate(String text, int maxChars) {
        return text.length() <= maxChars ? text : text.substring(0, maxChars);
    }
}
