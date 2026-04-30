package com.interviewprep.repository;

import com.interviewprep.domain.RealInterviewLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface RealInterviewLogRepository extends JpaRepository<RealInterviewLog, UUID> {
}
