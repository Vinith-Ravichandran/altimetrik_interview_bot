package com.interviewprep.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Profile;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Runs once on startup (prod profile only) to:
 * 1. Enable the pgvector extension.
 * 2. Add the embedding column to document_chunks.
 * 3. Create an HNSW index for fast cosine similarity search.
 *
 * Safe to re-run — all statements are idempotent (IF NOT EXISTS).
 */
@Component
@Profile("prod")
public class PgVectorInitializer {

    private static final Logger log = LoggerFactory.getLogger(PgVectorInitializer.class);
    private final JdbcTemplate jdbc;

    public PgVectorInitializer(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void initialize() {
        try {
            // 1. Enable pgvector extension
            jdbc.execute("CREATE EXTENSION IF NOT EXISTS vector");
            log.info("pgvector extension enabled");

            // 2. Add embedding column (1536 dims = voyage-large-2 / text-embedding-3-small)
            jdbc.execute(
                "ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS embedding vector(1536)"
            );
            log.info("embedding column ready on document_chunks");

            // 3. HNSW index for approximate nearest-neighbor search
            jdbc.execute(
                "CREATE INDEX IF NOT EXISTS idx_chunk_embedding " +
                "ON document_chunks USING hnsw (embedding vector_cosine_ops)"
            );
            log.info("HNSW index created on document_chunks.embedding");

        } catch (Exception e) {
            log.error("pgvector initialization failed — vector search will fall back to keyword mode. Error: {}", e.getMessage());
        }
    }
}
