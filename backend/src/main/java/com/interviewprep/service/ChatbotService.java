package com.interviewprep.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.interviewprep.domain.AppUser;
import com.interviewprep.domain.ChatMessage;
import com.interviewprep.domain.ChatSession;
import com.interviewprep.domain.DocumentChunk;
import com.interviewprep.dto.Dtos.*;
import com.interviewprep.repository.AppUserRepository;
import com.interviewprep.repository.ChatMessageRepository;
import com.interviewprep.repository.ChatSessionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Orchestrates the chatbot flow:
 *
 *  1. Resolve / create chat session
 *  2. Build conversation history
 *  3. Ask Claude to detect intent (VECTOR_SEARCH | GENERAL)
 *  4. Execute intent:
 *       VECTOR_SEARCH → retrieve relevant chunks → ask Claude to answer using context
 *       GENERAL       → ask Claude directly
 *  5. Persist user + assistant messages
 *  6. Return structured ChatResponse
 */
@Service
public class ChatbotService {

    private static final Logger log = LoggerFactory.getLogger(ChatbotService.class);

    private final ClaudeService        claudeService;
    private final VectorSearchService  vectorSearch;
    private final ChatSessionRepository   sessionRepo;
    private final ChatMessageRepository   messageRepo;
    private final AppUserRepository       userRepo;
    private final ObjectMapper         mapper = new ObjectMapper();

    public ChatbotService(ClaudeService claudeService,
                          VectorSearchService vectorSearch,
                          ChatSessionRepository sessionRepo,
                          ChatMessageRepository messageRepo,
                          AppUserRepository userRepo) {
        this.claudeService = claudeService;
        this.vectorSearch  = vectorSearch;
        this.sessionRepo   = sessionRepo;
        this.messageRepo   = messageRepo;
        this.userRepo      = userRepo;
    }

    // ── Main entry point ──────────────────────────────────────────────────────

    @Transactional
    public ChatResponse chat(ChatRequest req) {
        ChatSession session = resolveSession(req.sessionId(), req.userId());

        // Build recent history (last 10 messages for context)
        List<ChatMessage> history = messageRepo
                .findTop10BySession_IdOrderByCreatedAtDesc(session.getId());

        // Detect intent
        IntentResult intent = detectIntent(req.message(), history);

        // Execute intent and build context
        List<String> sources = List.of();
        String context = "";

        if ("VECTOR_SEARCH".equals(intent.action())) {
            List<DocumentChunk> chunks = vectorSearch.search(intent.searchQuery(), 5);
            sources = chunks.stream()
                    .map(c -> c.getDocument() != null ? c.getDocument().getFilename() : "unknown")
                    .distinct()
                    .collect(Collectors.toList());
            context = chunks.stream()
                    .map(DocumentChunk::getText)
                    .collect(Collectors.joining("\n---\n"));
        }

        // Generate final answer
        String reply = generateAnswer(req.message(), context, history);

        // Persist messages
        saveMessage(session, ChatMessage.Role.USER,      req.message(),  null);
        saveMessage(session, ChatMessage.Role.ASSISTANT, reply, intent.action());

        session.setLastMessageAt(Instant.now());

        return new ChatResponse(session.getId(), reply, intent.action(), sources, Instant.now());
    }

    // ── Intent detection ──────────────────────────────────────────────────────

    private IntentResult detectIntent(String message, List<ChatMessage> history) {
        String historyText = history.stream()
                .map(m -> m.getRole().name() + ": " + m.getContent())
                .collect(Collectors.joining("\n"));

        String system = """
                You are an intent classifier for an interview prep assistant.
                Analyse the user's message and decide the best action.

                Return ONLY valid JSON — no markdown, no explanation:
                {
                  "action": "VECTOR_SEARCH" | "GENERAL",
                  "search_query": "<optimised search query if action=VECTOR_SEARCH, else empty string>"
                }

                Use VECTOR_SEARCH when the user asks about:
                - Study materials, documents, notes, guides
                - Technical topics that may be in uploaded materials
                - "What does the document say about..."
                - Questions about specific technologies/concepts

                Use GENERAL for:
                - Greetings, small talk
                - Questions about the platform itself
                - Performance feedback requests
                - Anything not requiring document lookup
                """;

        String prompt = (historyText.isBlank() ? "" : "Recent conversation:\n" + historyText + "\n\n")
                + "User message: " + message;

        try {
            String raw = claudeService.complete(system, prompt);
            int s = raw.indexOf('{'), e = raw.lastIndexOf('}');
            if (s >= 0 && e > s) {
                JsonNode n = mapper.readTree(raw.substring(s, e + 1));
                String action = n.path("action").asText("GENERAL");
                String query  = n.path("search_query").asText(message);
                return new IntentResult(action, query.isBlank() ? message : query);
            }
        } catch (Exception ex) {
            log.warn("Intent detection failed: {}", ex.getMessage());
        }
        return new IntentResult("GENERAL", message);
    }

    // ── Answer generation ─────────────────────────────────────────────────────

    private String generateAnswer(String question, String context, List<ChatMessage> history) {
        String historyText = history.stream()
                .map(m -> m.getRole().name() + ": " + m.getContent())
                .collect(Collectors.joining("\n"));

        String system = """
                You are a helpful interview preparation assistant.
                Be concise, accurate, and encouraging.
                If the answer uses study material context, cite it naturally.
                """;

        String prompt = (historyText.isBlank() ? "" : "Conversation history:\n" + historyText + "\n\n")
                + (context.isBlank() ? "" : "Relevant study material:\n" + context + "\n\n")
                + "User: " + question;

        String reply = claudeService.complete(system, prompt);
        return reply == null || reply.isBlank() ? "I'm sorry, I couldn't generate a response. Please try again." : reply.trim();
    }

    // ── Session management ────────────────────────────────────────────────────

    private ChatSession resolveSession(UUID sessionId, UUID userId) {
        if (sessionId != null) {
            return sessionRepo.findById(sessionId)
                    .orElseGet(() -> newSession(userId));
        }
        return newSession(userId);
    }

    private ChatSession newSession(UUID userId) {
        ChatSession s = new ChatSession();
        if (userId != null) {
            userRepo.findById(userId).ifPresent(u -> s.setUser(u));
        }
        return sessionRepo.save(s);
    }

    private void saveMessage(ChatSession session, ChatMessage.Role role, String content, String intent) {
        ChatMessage m = new ChatMessage();
        m.setSession(session);
        m.setRole(role);
        m.setContent(content);
        m.setIntent(intent);
        messageRepo.save(m);
    }

    // ── Private records ───────────────────────────────────────────────────────

    private record IntentResult(String action, String searchQuery) {}
}
