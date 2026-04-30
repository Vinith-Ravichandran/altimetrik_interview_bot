package com.interviewprep.api;

import com.interviewprep.service.ClaudeService;
import com.interviewprep.service.EmbeddingService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * GET /api/v1/admin/ai/status
 * Tests whether OpenAI Chat and OpenAI Embeddings keys are configured and responsive.
 */
@RestController
@RequestMapping("/api/v1/admin/ai")
public class AiStatusController {

    private final ClaudeService    llmService;
    private final EmbeddingService embeddingService;

    public AiStatusController(ClaudeService llmService, EmbeddingService embeddingService) {
        this.llmService       = llmService;
        this.embeddingService = embeddingService;
    }

    @GetMapping("/status")
    public Map<String, Object> status() {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("timestamp", Instant.now().toString());

        // ── OpenAI Chat ───────────────────────────────────────────────────────
        Map<String, Object> chat = new LinkedHashMap<>();
        chat.put("provider",    "OpenAI");
        chat.put("configured",  llmService.isConfigured());

        if (llmService.isConfigured()) {
            long start = System.currentTimeMillis();
            try {
                String reply = llmService.complete(
                        "You are a test assistant. Reply with exactly one word.",
                        "Reply with the single word: OK"
                );
                boolean success = reply != null && !reply.startsWith("[OpenAI API");
                chat.put("status",    success ? "reachable" : "error");
                chat.put("testReply", reply.trim());
                chat.put("latencyMs", System.currentTimeMillis() - start);
            } catch (Exception e) {
                chat.put("status",    "error");
                chat.put("error",     e.getMessage());
                chat.put("latencyMs", System.currentTimeMillis() - start);
            }
        } else {
            chat.put("status", "not_configured");
            chat.put("hint",   "Set OPENAI_API_KEY environment variable");
        }
        result.put("openai_chat", chat);

        // ── OpenAI Embeddings ─────────────────────────────────────────────────
        Map<String, Object> emb = new LinkedHashMap<>();
        emb.put("provider",   "OpenAI");
        emb.put("model",      "text-embedding-3-small");
        emb.put("configured", embeddingService.isConfigured());

        if (embeddingService.isConfigured()) {
            long start = System.currentTimeMillis();
            try {
                float[] vec = embeddingService.embed("test");
                emb.put("status",     vec != null ? "reachable" : "error");
                emb.put("dimensions", vec != null ? vec.length  : 0);
                emb.put("latencyMs",  System.currentTimeMillis() - start);
            } catch (Exception e) {
                emb.put("status",    "error");
                emb.put("error",     e.getMessage());
                emb.put("latencyMs", System.currentTimeMillis() - start);
            }
        } else {
            emb.put("status", "not_configured");
            emb.put("hint",   "Uses same OPENAI_API_KEY — falls back to keyword search without it");
        }
        result.put("openai_embeddings", emb);

        return result;
    }
}
