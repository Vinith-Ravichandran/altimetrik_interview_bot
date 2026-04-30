package com.interviewprep.repository;

import com.interviewprep.domain.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {
    List<ChatMessage> findBySession_IdOrderByCreatedAtAsc(UUID sessionId);
    List<ChatMessage> findTop10BySession_IdOrderByCreatedAtDesc(UUID sessionId);
}
