package com.interviewprep;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync // Required for DocumentService.generateEmbeddingsAsync()
public class InterviewPrepApplication {
    public static void main(String[] args) {
        SpringApplication.run(InterviewPrepApplication.class, args);
    }
}
