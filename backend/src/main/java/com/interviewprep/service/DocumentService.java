package com.interviewprep.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.interviewprep.config.StorageService;
import com.interviewprep.domain.Document;
import com.interviewprep.domain.DocumentChunk;
import com.interviewprep.repository.DocumentChunkRepository;
import com.interviewprep.repository.DocumentRepository;
import org.apache.tika.Tika;
import org.apache.tika.exception.TikaException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class DocumentService {

    private static final Logger log = LoggerFactory.getLogger(DocumentService.class);
    private static final int CHUNK_SIZE    = 1500;
    private static final int CHUNK_OVERLAP = 150;

    private final DocumentRepository     documentRepository;
    private final DocumentChunkRepository chunkRepository;
    private final StorageService          storage;
    private final ClaudeService           claudeService;
    private final EmbeddingService        embeddingService;
    private final ObjectMapper            mapper = new ObjectMapper();
    private final Tika                    tika   = new Tika();

    public DocumentService(DocumentRepository documentRepository,
                           DocumentChunkRepository chunkRepository,
                           StorageService storage,
                           ClaudeService claudeService,
                           EmbeddingService embeddingService) {
        this.documentRepository = documentRepository;
        this.chunkRepository    = chunkRepository;
        this.storage            = storage;
        this.claudeService      = claudeService;
        this.embeddingService   = embeddingService;
        this.tika.setMaxStringLength(10 * 1024 * 1024);
    }

    // ── Upload ────────────────────────────────────────────────────────────────

    @Transactional
    public Document upload(MultipartFile file, String accountName, String roleName)
            throws IOException, TikaException {

        // 1. Persist raw file to local filesystem
        Path stored = storage.store(file);

        // 2. Extract text with Apache Tika
        String text;
        try (var in = file.getInputStream()) {
            text = tika.parseToString(in);
        }

        // 3. LLM: categorise + tag (best-effort; null-safe)
        CategoryResult cr = categorize(text);

        // 4. Save document metadata
        Document doc = new Document();
        doc.setFilename(file.getOriginalFilename() != null ? file.getOriginalFilename() : "untitled");
        doc.setContentType(file.getContentType() != null ? file.getContentType() : "application/octet-stream");
        doc.setSizeBytes(file.getSize());
        doc.setFilePath(stored.toString());
        doc.setExtractedText(text);
        doc.setAccountName(accountName);
        doc.setRoleName(roleName);
        doc.setCategory(cr.category());
        doc.setTags(cr.tags());
        documentRepository.save(doc);

        // 5. Chunk text + save chunks
        List<DocumentChunk> chunks = new ArrayList<>();
        for (ChunkRecord c : chunkText(text)) {
            DocumentChunk dc = new DocumentChunk();
            dc.setDocument(doc);
            dc.setChunkIndex(c.index());
            dc.setText(c.text());
            chunks.add(chunkRepository.save(dc));
        }

        // 6. Generate + store embeddings asynchronously (non-blocking)
        generateEmbeddingsAsync(chunks);

        return doc;
    }

    // ── Async embedding generation ────────────────────────────────────────────

    @Async
    public void generateEmbeddingsAsync(List<DocumentChunk> chunks) {
        if (!embeddingService.isConfigured()) return;
        for (DocumentChunk chunk : chunks) {
            try {
                float[] vec = embeddingService.embed(chunk.getText());
                if (vec != null) {
                    embeddingService.storeEmbedding(chunk.getId(), vec);
                }
            } catch (Exception e) {
                log.warn("Embedding failed for chunk {}: {}", chunk.getId(), e.getMessage());
            }
        }
    }

    // ── LLM categorisation ────────────────────────────────────────────────────

    private CategoryResult categorize(String text) {
        if (!claudeService.isConfigured() || text == null || text.isBlank()) {
            return new CategoryResult("General", "");
        }
        String preview = text.length() > 3000 ? text.substring(0, 3000) : text;
        String system = """
                You are a document classifier. Analyse the text and return ONLY a JSON object.
                No explanation. No markdown. Just JSON.
                Schema: {"category": "<short category name>", "tags": "<comma-separated lowercase tags>"}
                """;
        String prompt = "Classify this document:\n\n" + preview;
        try {
            String raw = claudeService.complete(system, prompt);
            int s = raw.indexOf('{'), e = raw.lastIndexOf('}');
            if (s >= 0 && e > s) {
                JsonNode n = mapper.readTree(raw.substring(s, e + 1));
                return new CategoryResult(
                        n.path("category").asText("General"),
                        n.path("tags").asText(""));
            }
        } catch (Exception ex) {
            log.warn("Document categorisation failed: {}", ex.getMessage());
        }
        return new CategoryResult("General", "");
    }

    // ── CRUD ──────────────────────────────────────────────────────────────────

    public Document get(UUID id) {
        return documentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Document not found: " + id));
    }

    public List<Document> list() { return documentRepository.findAll(); }

    @Transactional
    public void delete(UUID id) {
        Document doc = get(id);
        storage.delete(doc.getFilePath());
        documentRepository.deleteById(id);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private record ChunkRecord(int index, String text) {}

    private List<ChunkRecord> chunkText(String text) {
        List<ChunkRecord> chunks = new ArrayList<>();
        if (text == null || text.isBlank()) return chunks;
        int start = 0, idx = 0;
        while (start < text.length()) {
            int end = Math.min(start + CHUNK_SIZE, text.length());
            chunks.add(new ChunkRecord(idx++, text.substring(start, end)));
            if (end == text.length()) break;
            start = end - CHUNK_OVERLAP;
        }
        return chunks;
    }

    private record CategoryResult(String category, String tags) {}
}
