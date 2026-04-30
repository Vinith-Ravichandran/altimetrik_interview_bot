package com.interviewprep.api;

import com.interviewprep.dto.Dtos.*;
import com.interviewprep.service.ChatbotService;
import org.springframework.web.bind.annotation.*;

/**
 * Chatbot endpoint.
 *
 * POST /api/v1/chat
 *   Body: { sessionId (optional), userId (optional), message }
 *   Returns: { sessionId, reply, intent, sources[], timestamp }
 *
 * Pass sessionId from a previous response to continue a conversation.
 * Omit sessionId to start a new session.
 */
@RestController
@RequestMapping("/api/v1/chat")
public class ChatController {

    private final ChatbotService chatbotService;

    public ChatController(ChatbotService chatbotService) {
        this.chatbotService = chatbotService;
    }

    @PostMapping
    public ChatResponse chat(@RequestBody ChatRequest req) {
        return chatbotService.chat(req);
    }
}
