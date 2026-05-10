package com.interviewprep.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "interview_sessions", schema = "interview_bot")
public class InterviewSessionRecord {

    @Id @Column(nullable = false)
    private UUID id;

    @Column(name = "user_id")
    private UUID userId;

    private String company;
    private String role;
    private String status;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "overall_score")
    private Double overallScore;

    @Column(name = "skill_level")
    private String skillLevel;

    @Column(name = "overall_feedback", columnDefinition = "TEXT")
    private String overallFeedback;

    /** DB_QUESTIONS or TECH_STACK */
    @Column(name = "mode")
    private String mode = "DB_QUESTIONS";

    @Column(name = "tech_stack")
    private String techStack;

    @Column(name = "current_question", columnDefinition = "TEXT")
    private String currentQuestion;

    @Column(name = "depth_level")
    private Integer depthLevel = 0;

    @Column(name = "failure_count")
    private Integer failureCount = 0;

    /** JSON array of BotQuestion UUIDs in selection order (for DB_QUESTIONS mode) */
    @Column(name = "question_pool_json", columnDefinition = "TEXT")
    private String questionPoolJson;

    public InterviewSessionRecord() {}

    public UUID getId()                         { return id; }
    public void setId(UUID id)                  { this.id = id; }
    public UUID getUserId()                     { return userId; }
    public void setUserId(UUID v)               { this.userId = v; }
    public String getCompany()                  { return company; }
    public void setCompany(String v)            { this.company = v; }
    public String getRole()                     { return role; }
    public void setRole(String v)               { this.role = v; }
    public String getStatus()                   { return status; }
    public void setStatus(String v)             { this.status = v; }
    public LocalDateTime getCreatedAt()         { return createdAt; }
    public void setCreatedAt(LocalDateTime v)   { this.createdAt = v; }
    public LocalDateTime getCompletedAt()       { return completedAt; }
    public void setCompletedAt(LocalDateTime v) { this.completedAt = v; }
    public Double getOverallScore()             { return overallScore; }
    public void setOverallScore(Double v)       { this.overallScore = v; }
    public String getSkillLevel()               { return skillLevel; }
    public void setSkillLevel(String v)         { this.skillLevel = v; }
    public String getOverallFeedback()          { return overallFeedback; }
    public void setOverallFeedback(String v)    { this.overallFeedback = v; }
    public String getMode()                       { return mode; }
    public void setMode(String v)                 { this.mode = v; }
    public String getTechStack()                  { return techStack; }
    public void setTechStack(String v)            { this.techStack = v; }
    public String getCurrentQuestion()            { return currentQuestion; }
    public void setCurrentQuestion(String v)      { this.currentQuestion = v; }
    public Integer getDepthLevel()                { return depthLevel != null ? depthLevel : 0; }
    public void setDepthLevel(Integer v)          { this.depthLevel = v; }
    public Integer getFailureCount()              { return failureCount != null ? failureCount : 0; }
    public void setFailureCount(Integer v)        { this.failureCount = v; }
    public String getQuestionPoolJson()           { return questionPoolJson; }
    public void setQuestionPoolJson(String v)     { this.questionPoolJson = v; }
}
