package com.interviewprep.service;

import com.interviewprep.domain.BotQuestion;
import com.interviewprep.dto.BotDtos;
import com.interviewprep.repository.BotQuestionRepository;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class BotQuestionService {

    private final BotQuestionRepository botQuestionRepository;

    public BotQuestionService(BotQuestionRepository botQuestionRepository) {
        this.botQuestionRepository = botQuestionRepository;
    }

    public List<BotDtos.BotQuestionDto> getQuestions(String company, String role) {
        List<BotQuestion> questions;

        if (company != null && role != null) {
            questions = botQuestionRepository.findByCompanyAndRole(company, role);
        } else if (company != null) {
            questions = botQuestionRepository.findByCompany(company);
        } else if (role != null) {
            questions = botQuestionRepository.findByRole(role);
        } else {
            questions = botQuestionRepository.findAll();
        }

        return questions.stream()
            .limit(50)
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    private BotDtos.BotQuestionDto toDto(BotQuestion q) {
        return new BotDtos.BotQuestionDto(
            q.getId(), q.getContent(), q.getCategory(),
            q.getCompany(), q.getRole(), q.getDifficulty(), q.getCreatedAt()
        );
    }
}
