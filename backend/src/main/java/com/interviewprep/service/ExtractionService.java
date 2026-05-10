package com.interviewprep.service;

import org.apache.tika.Tika;
import org.apache.tika.exception.TikaException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;

@Service
public class ExtractionService {

    private static final Logger log = LoggerFactory.getLogger(ExtractionService.class);

    private final Tika tika = new Tika();

    public String extractText(String filePath) {
        File file = new File(filePath);

        if (!file.exists()) {
            log.error("[EXTRACTION] File not found: {}", filePath);
            throw new RuntimeException("File does not exist: " + filePath);
        }

        long fileSizeKb = file.length() / 1024;
        log.info("[EXTRACTION] Starting — file={} size={}KB", file.getName(), fileSizeKb);

        try {
            String text = tika.parseToString(file);

            if (text == null || text.isBlank()) {
                log.warn("[EXTRACTION] Empty text extracted from file={}", file.getName());
                return "";
            }

            log.info("[EXTRACTION] Complete — file={} extractedChars={}", file.getName(), text.length());
            return text;

        } catch (IOException e) {
            log.error("[EXTRACTION] IO error reading file={}: {}", file.getName(), e.getMessage());
            throw new RuntimeException("Failed to read file: " + e.getMessage(), e);

        } catch (TikaException e) {
            log.error("[EXTRACTION] Tika parse error for file={}: {}", file.getName(), e.getMessage());
            throw new RuntimeException("Failed to extract text (unsupported format?): " + e.getMessage(), e);
        }
    }
}
