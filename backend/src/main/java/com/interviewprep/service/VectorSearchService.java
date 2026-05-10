package com.interviewprep.service;

import com.interviewprep.domain.DocumentChunk;
import com.interviewprep.repository.DocumentChunkRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class VectorSearchService {

    private static final Logger log = LoggerFactory.getLogger(VectorSearchService.class);

    private final JdbcTemplate             jdbc;
    private final DocumentChunkRepository  chunkRepository;
    private final EmbeddingService         embeddingService;

    public VectorSearchService(JdbcTemplate jdbc,
                               DocumentChunkRepository chunkRepository,
                               EmbeddingService embeddingService) {
        this.jdbc             = jdbc;
        this.chunkRepository  = chunkRepository;
        this.embeddingService = embeddingService;
    }

    /**
     * Runs OUTSIDE any transaction (NOT_SUPPORTED suspends the caller's TX).
     * This means no transaction is created for the search itself — so there is
     * nothing to commit or rollback, and no UnexpectedRollbackException can
     * propagate back to the caller's transaction if the search fails.
     */
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public List<DocumentChunk> search(String query, int topK) {
        if (query == null || query.isBlank()) return List.of();

        try {
            float[] embedding = embeddingService.embed(query);
            if (embedding != null) {
                try {
                    return vectorSearch(embedding, topK);
                } catch (Exception e) {
                    log.warn("[SEARCH] pgvector failed, falling back to keyword: {}", e.getMessage());
                }
            }
            return keywordSearch(query, topK);
        } catch (Exception e) {
            log.warn("[SEARCH] Document search failed — continuing without context: {}", e.getMessage());
            return List.of();
        }
    }

    // ── pgvector cosine similarity ────────────────────────────────────────────

    private List<DocumentChunk> vectorSearch(float[] embedding, int topK) {
        String vectorLiteral = EmbeddingService.toVectorString(embedding);
        List<UUID> ids = jdbc.query(
            "SELECT id FROM app.document_chunks " +
            "WHERE embedding IS NOT NULL " +
            "ORDER BY embedding <-> CAST(? AS vector) LIMIT ?",
            (rs, rowNum) -> UUID.fromString(rs.getString("id")),
            vectorLiteral, topK
        );
        return ids.stream()
                .map(chunkRepository::findById)
                .filter(Optional::isPresent)
                .map(Optional::get)
                .collect(Collectors.toList());
    }

    // ── keyword ILIKE fallback ────────────────────────────────────────────────

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
