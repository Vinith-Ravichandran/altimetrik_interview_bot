package com.interviewprep.repository;

import com.interviewprep.domain.BotQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BotQuestionRepository extends JpaRepository<BotQuestion, UUID> {

    List<BotQuestion> findByCompanyAndRole(String company, String role);

    Optional<BotQuestion> findByNormalizedContent(String normalizedContent);

    List<BotQuestion> findByCompany(String company);

    List<BotQuestion> findByRole(String role);
}
