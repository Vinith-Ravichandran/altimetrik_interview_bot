package com.interviewprep.api;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> badRequest(IllegalArgumentException e) {
        log.warn("[ERROR] Invalid input: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorBody("Invalid input", e.getMessage()));
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> responseStatus(ResponseStatusException e) {
        log.warn("[ERROR] ResponseStatusException {}: {}", e.getStatusCode(), e.getReason());
        String msg = e.getReason() != null ? e.getReason() : e.getMessage();
        return ResponseEntity.status(e.getStatusCode()).body(errorBody("Request error", msg));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, String>> accessDenied(AccessDeniedException e) {
        log.warn("[ERROR] Access denied: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorBody("Access denied", e.getMessage()));
    }

    @ExceptionHandler(HttpClientErrorException.class)
    public ResponseEntity<Map<String, String>> httpClientError(HttpClientErrorException e) {
        String details = classifyClientError(e);
        log.error("[ERROR] Upstream HTTP {} error: {}", e.getStatusCode(), details);
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(errorBody("Upstream API error", details));
    }

    @ExceptionHandler(HttpServerErrorException.class)
    public ResponseEntity<Map<String, String>> httpServerError(HttpServerErrorException e) {
        log.error("[ERROR] Upstream server error {}: {}", e.getStatusCode(), e.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .body(errorBody("Upstream server error", "The AI service returned an error. Please try again."));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> generic(Exception e) {
        log.error("[ERROR] Unhandled exception [{}]: {}", e.getClass().getSimpleName(), e.getMessage(), e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(errorBody("Internal server error", e.getClass().getSimpleName() + ": " + e.getMessage()));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Map<String, String> errorBody(String error, String details) {
        Map<String, String> body = new LinkedHashMap<>();
        body.put("error", error);
        body.put("details", details != null ? details : "No details available");
        String requestId = MDC.get("requestId");
        if (requestId != null) body.put("requestId", requestId);
        return body;
    }

    private String classifyClientError(HttpClientErrorException e) {
        return switch (e.getStatusCode().value()) {
            case 401 -> "Invalid API key — check your OPENAI_API_KEY or CLAUDE_API_KEY";
            case 403 -> "API key does not have permission for this operation";
            case 429 -> "Rate limit exceeded — too many requests to the AI API";
            case 400 -> "Bad request sent to AI API: " + e.getMessage();
            default  -> e.getMessage();
        };
    }
}
