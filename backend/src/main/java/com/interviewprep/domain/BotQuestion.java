package com.interviewprep.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "questions", schema = "interview_bot")
public class BotQuestion {

    @Id
    @Column(nullable = false)
    private UUID id;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "normalized_content", columnDefinition = "TEXT")
    private String normalizedContent;

    @Column(name = "category")
    private String category;

    @Column(name = "company")
    private String company;

    @Column(name = "role")
    private String role;

    @Column(name = "difficulty")
    private String difficulty;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public BotQuestion() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getNormalizedContent() { return normalizedContent; }
    public void setNormalizedContent(String normalizedContent) { this.normalizedContent = normalizedContent; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getCompany() { return company; }
    public void setCompany(String company) { this.company = company; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getDifficulty() { return difficulty; }
    public void setDifficulty(String difficulty) { this.difficulty = difficulty; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
