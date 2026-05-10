package com.interviewprep.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.interviewprep.dto.CategorizedQuestion;
import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.properties.TextAlignment;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class PdfService {

    private static final Logger log = LoggerFactory.getLogger(PdfService.class);

    private static final List<String> CATEGORY_ORDER =
        List.of("SQL", "Python", "Java", "BigQuery", "GCS", "Others");

    private final ObjectMapper mapper = new ObjectMapper();
    private final DeduplicationService deduplicationService;

    @Value("${app.master-pdf.path:./data/master_questions.pdf}")
    private String pdfPath;

    @Value("${app.master-pdf.json-path:./data/master_questions.json}")
    private String jsonPath;

    public PdfService(DeduplicationService deduplicationService) {
        this.deduplicationService = deduplicationService;
    }

    @PostConstruct
    public void init() {
        File pdfFile = new File(pdfPath);
        if (pdfFile.getParentFile() != null) {
            pdfFile.getParentFile().mkdirs();
        }
        log.info("[PDF] Storage directory ready — pdfPath={} jsonPath={}", pdfPath, jsonPath);
    }

    /** Returns all stored questions flat — used by GET /questions endpoint. */
    public List<CategorizedQuestion> readAllQuestions() {
        return readExistingQuestions();
    }

    public List<CategorizedQuestion> readExistingQuestions() {
        File jsonFile = new File(jsonPath);

        if (!jsonFile.exists()) {
            log.info("[PDF] No existing JSON found at {} — starting fresh", jsonPath);
            return new ArrayList<>();
        }

        log.info("[PDF] Reading existing questions from {}", jsonPath);
        try {
            List<CategorizedQuestion> existing = mapper.readValue(
                jsonFile, new TypeReference<List<CategorizedQuestion>>() {}
            );
            log.info("[PDF] Loaded {} existing questions", existing.size());
            return existing;
        } catch (IOException e) {
            log.error("[PDF] Failed to read existing JSON: {} — starting fresh", e.getMessage());
            return new ArrayList<>();
        }
    }

    public void mergeAndWrite(List<CategorizedQuestion> incoming) {
        log.info("[PDF] MERGE starting — incomingCount={}", incoming.size());

        List<CategorizedQuestion> existing = readExistingQuestions();
        log.info("[PDF] MERGE — existing={} incoming={} total before dedup={}",
            existing.size(), incoming.size(), existing.size() + incoming.size());

        List<CategorizedQuestion> merged = new ArrayList<>(existing);
        merged.addAll(incoming);
        List<CategorizedQuestion> deduped = deduplicationService.deduplicate(merged);

        log.info("[PDF] MERGE complete — totalAfterDedup={} (removed={})",
            deduped.size(), merged.size() - deduped.size());

        // Write JSON shadow
        try {
            mapper.writerWithDefaultPrettyPrinter().writeValue(new File(jsonPath), deduped);
            log.info("[PDF] JSON shadow written — path={} questions={}", jsonPath, deduped.size());
        } catch (IOException e) {
            log.error("[PDF] Failed to write JSON shadow at {}: {}", jsonPath, e.getMessage());
        }

        // Group by category
        Map<String, List<String>> grouped = new LinkedHashMap<>();
        for (String cat : CATEGORY_ORDER) {
            grouped.put(cat, new ArrayList<>());
        }
        for (CategorizedQuestion q : deduped) {
            String cat = normalizeCategory(q.getCategory());
            grouped.computeIfAbsent(cat, k -> new ArrayList<>()).add(q.getQuestion());
        }

        for (Map.Entry<String, List<String>> entry : grouped.entrySet()) {
            if (!entry.getValue().isEmpty()) {
                log.debug("[PDF] Category {} — {} questions", entry.getKey(), entry.getValue().size());
            }
        }

        writeMasterPdf(grouped);
    }

    public void writeMasterPdf(Map<String, List<String>> grouped) {
        log.info("[PDF] Writing master PDF to {}", pdfPath);
        try {
            PdfFont bold    = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);
            PdfFont regular = PdfFontFactory.createFont(StandardFonts.HELVETICA);

            PdfWriter  writer = new PdfWriter(pdfPath);
            PdfDocument pdf   = new PdfDocument(writer);
            Document   doc    = new Document(pdf);

            doc.add(new Paragraph("Interview Questions — Master Document")
                .setFont(bold).setFontSize(18)
                .setTextAlignment(TextAlignment.CENTER).setMarginBottom(20));

            int totalWritten = 0;
            for (String category : CATEGORY_ORDER) {
                List<String> questions = grouped.getOrDefault(category, Collections.emptyList());
                if (questions.isEmpty()) continue;

                doc.add(new Paragraph("=== " + category + " ===")
                    .setFont(bold).setFontSize(14)
                    .setFontColor(ColorConstants.DARK_GRAY)
                    .setMarginTop(16).setMarginBottom(6));

                for (int i = 0; i < questions.size(); i++) {
                    doc.add(new Paragraph((i + 1) + ". " + questions.get(i))
                        .setFont(regular).setFontSize(11).setMarginBottom(4));
                }
                totalWritten += questions.size();
            }

            doc.close();
            log.info("[PDF] Master PDF written — path={} totalQuestions={}", pdfPath, totalWritten);

        } catch (IOException e) {
            log.error("[PDF] Failed to write master PDF at {}: {}", pdfPath, e.getMessage());
            throw new RuntimeException("PDF generation failed", e);
        }
    }

    private String normalizeCategory(String category) {
        if (category == null) return "Others";
        String c = category.trim();
        for (String valid : CATEGORY_ORDER) {
            if (valid.equalsIgnoreCase(c)) return valid;
        }
        return "Others";
    }
}
