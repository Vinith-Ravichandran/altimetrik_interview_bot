package com.interviewprep.api;

import com.interviewprep.domain.Document;
import com.interviewprep.dto.Dtos.DocumentDto;
import com.interviewprep.service.DocumentService;
import com.interviewprep.service.ExportService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/documents")
public class DocumentController {

    private final DocumentService documentService;
    private final ExportService   exportService;

    public DocumentController(DocumentService documentService, ExportService exportService) {
        this.documentService = documentService;
        this.exportService   = exportService;
    }

    /**
     * Upload a file with optional account/role tagging.
     *
     * multipart fields:
     *   file        — required
     *   accountName — optional  (e.g. "PayPal")
     *   roleName    — optional  (e.g. "Data Engineer")
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public DocumentDto upload(
            @RequestParam("file")                             MultipartFile file,
            @RequestParam(value = "accountName", required = false) String accountName,
            @RequestParam(value = "roleName",    required = false) String roleName) throws Exception {
        return DocumentDto.of(documentService.upload(file, accountName, roleName));
    }

    @GetMapping
    public List<DocumentDto> list() {
        return documentService.list().stream().map(DocumentDto::of).toList();
    }

    @GetMapping("/{id}")
    public DocumentDto get(@PathVariable UUID id) {
        return DocumentDto.of(documentService.get(id));
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable UUID id) {
        documentService.delete(id);
    }

    @GetMapping("/{id}/export")
    public ResponseEntity<byte[]> export(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "pdf") String format) {
        Document doc = documentService.get(id);
        byte[] bytes;
        MediaType type;
        String ext;
        if ("docx".equalsIgnoreCase(format)) {
            bytes = exportService.toDocx(doc);
            type  = MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
            ext   = "docx";
        } else {
            bytes = exportService.toPdf(doc);
            type  = MediaType.APPLICATION_PDF;
            ext   = "pdf";
        }
        String name = stripExtension(doc.getFilename()) + "." + ext;
        return ResponseEntity.ok()
                .contentType(type)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + name + "\"")
                .body(bytes);
    }

    private String stripExtension(String name) {
        int dot = name.lastIndexOf('.');
        return dot < 0 ? name : name.substring(0, dot);
    }
}
