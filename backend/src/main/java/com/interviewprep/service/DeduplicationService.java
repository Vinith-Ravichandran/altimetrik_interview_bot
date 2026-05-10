package com.interviewprep.service;

import com.interviewprep.dto.CategorizedQuestion;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class DeduplicationService {

    private static final Logger log = LoggerFactory.getLogger(DeduplicationService.class);

    private static final Set<String> STOPWORDS = Set.of(
        "a", "an", "the", "is", "are", "was", "were", "what", "how", "why",
        "when", "where", "which", "who", "can", "you", "do", "does", "in",
        "on", "at", "to", "for", "of", "and", "or", "with", "that", "this",
        "it", "its", "be", "by", "from", "as", "explain", "describe", "define",
        "difference", "between", "vs", "give", "example", "examples", "use",
        "write", "list", "name"
    );

    public String normalize(String text) {
        String[] tokens = text.toLowerCase()
            .replaceAll("[^a-z0-9\\s]", " ")
            .trim()
            .split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (String token : tokens) {
            if (!token.isBlank() && !STOPWORDS.contains(token)) {
                if (sb.length() > 0) sb.append(' ');
                sb.append(token);
            }
        }
        return sb.toString();
    }

    public List<CategorizedQuestion> deduplicate(List<CategorizedQuestion> questions) {
        int inputCount = questions.size();
        log.info("[DEDUP] Starting — inputCount={}", inputCount);

        List<CategorizedQuestion> result     = new ArrayList<>();
        Set<String>               seenExact  = new HashSet<>();
        List<Set<String>>         seenWords  = new ArrayList<>();
        int exactRemoved      = 0;
        int similarityRemoved = 0;

        for (CategorizedQuestion q : questions) {
            if (q.getQuestion() == null || q.getQuestion().isBlank()) continue;

            String norm = normalize(q.getQuestion());
            if (norm.isBlank()) continue;

            // Level 1: exact normalized match
            if (seenExact.contains(norm)) {
                log.debug("[DEDUP] Exact duplicate removed: \"{}\"", abbreviate(q.getQuestion()));
                exactRemoved++;
                continue;
            }

            // Level 2: Jaccard similarity > 0.75
            Set<String> words = wordSet(norm);
            boolean nearDup = false;
            for (Set<String> existing : seenWords) {
                if (jaccard(words, existing) >= 0.75) {
                    nearDup = true;
                    break;
                }
            }
            if (nearDup) {
                log.debug("[DEDUP] Near-duplicate removed (Jaccard≥0.75): \"{}\"", abbreviate(q.getQuestion()));
                similarityRemoved++;
                continue;
            }

            seenExact.add(norm);
            seenWords.add(words);
            result.add(q);
        }

        log.info("[DEDUP] Complete — input={} exactRemoved={} similarityRemoved={} output={}",
            inputCount, exactRemoved, similarityRemoved, result.size());
        return result;
    }

    private Set<String> wordSet(String normalized) {
        return new HashSet<>(Arrays.asList(normalized.split("\\s+")));
    }

    private double jaccard(Set<String> a, Set<String> b) {
        if (a.isEmpty() && b.isEmpty()) return 1.0;
        Set<String> intersection = new HashSet<>(a);
        intersection.retainAll(b);
        Set<String> union = new HashSet<>(a);
        union.addAll(b);
        return union.isEmpty() ? 0.0 : (double) intersection.size() / union.size();
    }

    private String abbreviate(String s) {
        return s.length() > 60 ? s.substring(0, 60) + "..." : s;
    }
}
