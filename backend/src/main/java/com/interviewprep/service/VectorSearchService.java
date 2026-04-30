package com.interviewprep.service;

import com.interviewprep.domain.DocumentChunk;
import com.interviewprep.repository.DocumentChunkRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Semantic search over document chunks.
 *
 * Strategy (in priority order):
 *   1. pgvector cosine similarity  — when Voyage AI embeddings are available
 *   2. Keyword LIKE scan            — fallback for dev (H2) or when Voyage key is absent
 */
@Service
public class VectorSearchService {

    private static final Logger log = LoggerFactory.getLogger(VectorSearchService.class);

    private final JdbcTemplate jdbc;
    private final DocumentChunkRepository chunkRepository;
    private final EmbeddingService embeddingService;

    public VectorSearchService(JdbcTemplate jdbc,
                               DocumentChunkRepository chunkRepository,
                               EmbeddingService embeddingService) {
        this.jdbc = jdbc;
        this.chunkRepository = chunkRepository;
        this.embeddingService = embeddingService;
    }

    /**
     * Find the top-K most relevant document chunks for a query.
     *
     * @param query natural language query
     * @param topK  number of results to return
     */
    public List<DocumentChunk> search(String query, int topK) {
        if (query == null || query.isBlank()) return List.of();

        float[] embedding = embeddingService.embed(query);
        if (embedding != null) {
            try {
                return vectorSearch(embedding, topK);
            } catch (Exception e) {
                log.warn("pgvector search failed, falling back to keyword: {}", e.getMessage());
            }
        }
        return keywordSearch(query, topK);
    }

    // ── pgvector cosine similarity search ─────────────────────────────────────

    private List<DocumentChunk> vectorSearch(float[] embedding, int topK) {
        String vectorLiteral = EmbeddingService.toVectorString(embedding);

        /*
         * Native pgvector query using cosine distance operator <->.
         * CAST is required because JDBC binds the string as text.
         */
        List<UUID> ids = jdbc.query(
            "SELECT id FROM document_chunks " +
            "WHERE embedding IS NOT NULL " +
            "ORDER BY embedding <-> CAST(? AS vector) " +
            "LIMIT ?",
            (rs, rowNum) -> UUID.fromString(rs.getString("id")),
            vectorLiteral, topK
        );

        return ids.stream()
                .map(id -> chunkRepository.findById(id))
                .filter(Optional::isPresent)
                .map(Optional::get)
                .collect(Collectors.toList());
    }

    // ── keyword LIKE scan (fallback) ──────────────────────────────────────────

    private List<DocumentChunk> keywordSearch(String query, int topK) {
        Set<DocumentChunk> hits = new LinkedHashSet<>();
        for (String term : tokenize(query)) {
            hits.addAll(chunkRepository.searchByTerm(term));
            if (hits.size() >= topK * 4) break;
        }
        return hits.stream().limit(topK).collect(Collectors.toList());
    }

    private List<String> tokenize(String query) {
        return Arrays.stream(query.toLowerCase().split("[^a-z0-9]+"))
                .filter(t -> t.length() > 2)
                .distinct()
                .limit(8)
                .toList();
    }
}
