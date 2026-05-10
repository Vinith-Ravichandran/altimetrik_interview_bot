package com.interviewprep.repository;

import com.interviewprep.domain.InterviewSessionRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface InterviewSessionRecordRepository extends JpaRepository<InterviewSessionRecord, UUID> {
    List<InterviewSessionRecord> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
