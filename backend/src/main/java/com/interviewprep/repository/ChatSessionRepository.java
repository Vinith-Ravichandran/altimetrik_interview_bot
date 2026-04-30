package com.interviewprep.repository;

import com.interviewprep.domain.ChatSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ChatSessionRepository extends JpaRepository<ChatSession, UUID> {
    List<ChatSession> findByUser_IdOrderByLastMessageAtDesc(UUID userId);
}
