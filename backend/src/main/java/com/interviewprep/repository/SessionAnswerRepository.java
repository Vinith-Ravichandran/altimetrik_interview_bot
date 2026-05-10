package com.interviewprep.repository;

import com.interviewprep.domain.SessionAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SessionAnswerRepository extends JpaRepository<SessionAnswer, UUID> {
    List<SessionAnswer> findBySessionIdOrderByCreatedAtAsc(UUID sessionId);
}
