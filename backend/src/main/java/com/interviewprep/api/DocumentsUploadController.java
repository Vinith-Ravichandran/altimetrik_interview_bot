package com.interviewprep.api;

import com.interviewprep.domain.BotQuestion;
import com.interviewprep.domain.FileRecord;
import com.interviewprep.dto.CategorizedQuestion;
import com.interviewprep.dto.FileRecordDto;
import com.interviewprep.dto.UploadResultDto;
import com.interviewprep.repository.BotQuestionRepository;
import com.interviewprep.repository.FileRecordRepository;
import com.interviewprep.service.ClaudeService;
import com.interviewprep.service.DeduplicationService;
import com.interviewprep.service.ExtractionService;
import com.interviewprep.service.PdfService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/process")
public class DocumentsUploadController {

    private static final Logger log = LoggerFactory.getLogger(DocumentsUploadController.class);

    private final ExtractionService    extractionService;
    private final ClaudeService        claudeService;
    private final DeduplicationService deduplicationService;
    private final PdfService           pdfService;
    private final FileRecordRepository fileRecordRepository;
    private final BotQuestionRepository botQuestionRepository;

    @Value("${app.master-pdf.path:./data/master_questions.pdf}")
    private String pdfPath;

    public DocumentsUploadController(ExtractionService extractionService,
                                     ClaudeService claudeService,
                                     DeduplicationService deduplicationService,
                                     PdfService pdfService,
                                     FileRecordRepository fileRecordRepository,
                                     BotQuestionRepository botQuestionRepository) {
        this.extractionService    = extractionService;
        this.claudeService        = claudeService;
        this.deduplicationService = deduplicationService;
        this.pdfService           = pdfService;
        this.fileRecordRepository = fileRecordRepository;
        this.botQuestionRepository = botQuestionRepository;
    }

    // ── POST /upload ──────────────────────────────────────────────────────────

    @PostMapping("/upload")
    public ResponseEntity<UploadResultDto> upload(
            @RequestParam("files") MultipartFile[] files,
            @RequestParam(value = "accountName", required = false, defaultValue = "General") String accountName) {

        if (files == null || files.length == 0) {
            log.warn("[UPLOAD] Rejected — no files provided");
            return ResponseEntity.badRequest().build();
        }

        log.info("[UPLOAD] Starting — fileCount={} accountName={}", files.length, accountName);

        StringBuilder combined        = new StringBuilder();
        List<FileRecordDto> savedFiles = new ArrayList<>();

        for (MultipartFile file : files) {
            String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "unknown";
            log.info("[UPLOAD] File: name={} size={}KB type={}",
                originalName, file.getSize() / 1024, file.getContentType());

            File tempFile = null;
            try {
                tempFile = File.createTempFile("upload-", "-" + originalName);
                file.transferTo(tempFile);

                String text = extractionService.extractText(tempFile.getAbsolutePath());
                if (text.isBlank()) {
                    log.warn("[UPLOAD] Empty text extracted from {} — skipping", originalName);
                    continue;
                }

                combined.append("\n\n--- File: ").append(originalName).append(" ---\n\n").append(text);

                FileRecord record = new FileRecord();
                record.setId(UUID.randomUUID());
                record.setFileName(originalName);
                record.setFilePath("");
                record.setUploadedAt(LocalDateTime.now());
                fileRecordRepository.save(record);
                savedFiles.add(FileRecordDto.from(record));
                log.info("[UPLOAD] File record saved — name={}", originalName);

            } catch (Exception e) {
                log.error("[UPLOAD] Failed to process file={}: {}", originalName, e.getMessage());
            } finally {
                if (tempFile != null) {
                    try { Files.delete(tempFile.toPath()); } catch (IOException ignored) {}
                }
            }
        }

        if (combined.isEmpty()) {
            log.warn("[UPLOAD] No text could be extracted from any file");
            List<FileRecordDto> allFiles = getAllFileDtos();
            return ResponseEntity.ok(new UploadResultDto(0, 0, List.of(), allFiles));
        }

        log.info("[UPLOAD] All files extracted — combinedTextLen={} chars", combined.length());

        List<CategorizedQuestion> extracted = claudeService.extractCategorizedQuestions(combined.toString());
        int totalExtracted = extracted.size();
        log.info("[UPLOAD] LLM extraction done — extracted={}", totalExtracted);

        if (extracted.isEmpty()) {
            log.warn("[UPLOAD] LLM returned 0 questions — check API key and input content");
            List<FileRecordDto> allFiles = getAllFileDtos();
            return ResponseEntity.ok(new UploadResultDto(0, 0, List.of(), allFiles));
        }

        List<CategorizedQuestion> deduped = deduplicationService.deduplicate(extracted);
        int totalUnique = deduped.size();

        // Write to JSON shadow + master PDF
        pdfService.mergeAndWrite(deduped);

        // Also save to interview_bot.questions DB table (role-wise by category, tagged with account)
        saveQuestionsToDb(deduped, accountName);

        List<CategorizedQuestion> allQuestions = pdfService.readAllQuestions();
        List<FileRecordDto>       allFiles      = getAllFileDtos();

        log.info("[UPLOAD] Complete — extracted={} unique={} masterTotal={} totalFiles={}",
            totalExtracted, totalUnique, allQuestions.size(), allFiles.size());

        return ResponseEntity.ok(new UploadResultDto(totalExtracted, totalUnique, allQuestions, allFiles));
    }

    // ── GET /questions ────────────────────────────────────────────────────────

    @GetMapping("/questions")
    public ResponseEntity<UploadResultDto> getQuestions() {
        log.info("[QUESTIONS] Reading all questions from JSON shadow");
        List<CategorizedQuestion> all = pdfService.readAllQuestions();
        log.info("[QUESTIONS] Returning {} questions", all.size());
        return ResponseEntity.ok(new UploadResultDto(all.size(), all.size(), all, List.of()));
    }

    // ── GET /files ────────────────────────────────────────────────────────────

    @GetMapping("/files")
    public ResponseEntity<List<FileRecordDto>> getFiles() {
        log.info("[FILES] Fetching all uploaded file records");
        List<FileRecordDto> files = getAllFileDtos();
        log.info("[FILES] Returning {} file records", files.size());
        return ResponseEntity.ok(files);
    }

    // ── GET /download ─────────────────────────────────────────────────────────

    @GetMapping("/download")
    public ResponseEntity<Resource> downloadPdf() {
        File pdf = new File(pdfPath);
        if (!pdf.exists()) {
            log.warn("[DOWNLOAD] Master PDF not found at {}", pdfPath);
            return ResponseEntity.notFound().build();
        }
        log.info("[DOWNLOAD] Serving master PDF — path={} size={}KB", pdfPath, pdf.length() / 1024);
        Resource resource = new FileSystemResource(pdf);
        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_PDF)
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"master_questions.pdf\"")
            .body(resource);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private List<FileRecordDto> getAllFileDtos() {
        return fileRecordRepository.findAllByOrderByUploadedAtDesc()
            .stream().map(FileRecordDto::from).toList();
    }

    /**
     * Saves newly extracted questions into interview_bot.questions table,
     * tagged by category as the role (e.g. SQL questions → role="SQL").
     * Skips exact duplicates based on normalized content.
     */
    private void saveQuestionsToDb(List<CategorizedQuestion> questions, String accountName) {
        int saved = 0;
        String company = (accountName == null || accountName.isBlank()) ? "General" : accountName;
        Set<String> stopwords = Set.of("a","an","the","is","are","was","were","what","how","why",
            "when","where","which","who","can","do","does","in","on","at","to","for","of","and","or");

        for (CategorizedQuestion cq : questions) {
            if (cq.getQuestion() == null || cq.getQuestion().isBlank()) continue;

            String normalized = normalize(cq.getQuestion(), stopwords);
            Optional<BotQuestion> existing = botQuestionRepository.findByNormalizedContent(normalized);
            if (existing.isPresent()) continue;

            BotQuestion bq = new BotQuestion();
            bq.setId(UUID.randomUUID());
            bq.setContent(cq.getQuestion());
            bq.setNormalizedContent(normalized);
            bq.setCategory(cq.getCategory());
            bq.setRole(cq.getCategory());   // role = category (SQL, Python, Java …)
            bq.setCompany(company);          // tagged with chosen account
            bq.setDifficulty("Medium");
            bq.setCreatedAt(LocalDateTime.now());
            botQuestionRepository.save(bq);
            saved++;
        }
        log.info("[UPLOAD] Saved {} new questions to interview_bot.questions (company={})", saved, company);
    }

    private String normalize(String text, Set<String> stopwords) {
        String[] tokens = text.toLowerCase()
            .replaceAll("[^a-z0-9\\s]", " ").trim().split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (String token : tokens) {
            if (!token.isBlank() && !stopwords.contains(token)) {
                if (sb.length() > 0) sb.append(' ');
                sb.append(token);
            }
        }
        return sb.toString();
    }
}
