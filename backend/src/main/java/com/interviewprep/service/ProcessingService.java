package com.interviewprep.service;

import com.interviewprep.domain.BotQuestion;
import com.interviewprep.domain.FileQuestionMap;
import com.interviewprep.domain.FileQuestionMapId;
import com.interviewprep.dto.BotDtos;
import com.interviewprep.repository.BotQuestionRepository;
import com.interviewprep.repository.FileQuestionMapRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class ProcessingService {

    private static final Set<String> STOPWORDS = Set.of(
        "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
        "have", "has", "had", "do", "does", "did", "will", "would", "could",
        "should", "may", "might", "must", "shall", "can", "to", "of", "in",
        "for", "on", "with", "at", "by", "from", "up", "about", "into",
        "and", "but", "or", "if", "then", "as", "it", "its", "that", "this",
        "these", "those", "what", "which", "who", "when", "where", "how", "why"
    );

    private final ExtractionService extractionService;
    private final LLMService llmService;
    private final BotQuestionRepository botQuestionRepository;
    private final FileQuestionMapRepository fileQuestionMapRepository;

    public ProcessingService(ExtractionService extractionService,
                              LLMService llmService,
                              BotQuestionRepository botQuestionRepository,
                              FileQuestionMapRepository fileQuestionMapRepository) {
        this.extractionService = extractionService;
        this.llmService = llmService;
        this.botQuestionRepository = botQuestionRepository;
        this.fileQuestionMapRepository = fileQuestionMapRepository;
    }

    public BotDtos.ProcessResponse processFile(UUID fileId, String filePath, String company, String role) {
        String text = extractionService.extractText(filePath);
        List<BotDtos.ExtractedQuestion> extracted = llmService.extractQuestions(text);

        int deduplicated = 0;
        int stored = 0;

        List<BotQuestion> existing = botQuestionRepository.findByCompanyAndRole(company, role);

        for (BotDtos.ExtractedQuestion eq : extracted) {
            String normalized = normalize(eq.question());

            // Exact match
            Optional<BotQuestion> exactMatch = botQuestionRepository.findByNormalizedContent(normalized);
            if (exactMatch.isPresent()) {
                linkToFile(fileId, exactMatch.get().getId());
                deduplicated++;
                continue;
            }

            // Similarity match against existing questions for this company/role
            boolean similar = existing.stream()
                .anyMatch(q -> jaccardSimilarity(normalized, q.getNormalizedContent()) > 0.7);
            if (similar) {
                deduplicated++;
                continue;
            }

            BotQuestion question = new BotQuestion();
            question.setId(UUID.randomUUID());
            question.setContent(eq.question());
            question.setNormalizedContent(normalized);
            question.setCategory(eq.category());
            question.setCompany(company);
            question.setRole(role);
            question.setDifficulty(eq.difficulty());
            question.setCreatedAt(LocalDateTime.now());
            botQuestionRepository.save(question);

            linkToFile(fileId, question.getId());
            existing.add(question);
            stored++;
        }

        return new BotDtos.ProcessResponse(extracted.size(), deduplicated, stored);
    }

    private void linkToFile(UUID fileId, UUID questionId) {
        FileQuestionMapId mapId = new FileQuestionMapId(fileId, questionId);
        if (!fileQuestionMapRepository.existsById(mapId)) {
            fileQuestionMapRepository.save(new FileQuestionMap(mapId));
        }
    }

    String normalize(String text) {
        String lower = text.toLowerCase().replaceAll("[^a-z0-9\\s]", " ").trim();
        StringBuilder sb = new StringBuilder();
        for (String word : lower.split("\\s+")) {
            if (!word.isEmpty() && !STOPWORDS.contains(word)) {
                sb.append(word).append(" ");
            }
        }
        return sb.toString().trim();
    }

    double jaccardSimilarity(String a, String b) {
        if (a == null || b == null || a.isEmpty() || b.isEmpty()) return 0.0;
        Set<String> setA = new HashSet<>(Arrays.asList(a.split("\\s+")));
        Set<String> setB = new HashSet<>(Arrays.asList(b.split("\\s+")));
        Set<String> intersection = new HashSet<>(setA);
        intersection.retainAll(setB);
        Set<String> union = new HashSet<>(setA);
        union.addAll(setB);
        return union.isEmpty() ? 0.0 : (double) intersection.size() / union.size();
    }
}
