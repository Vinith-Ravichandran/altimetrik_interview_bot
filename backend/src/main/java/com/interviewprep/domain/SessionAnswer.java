package com.interviewprep.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "session_answers", schema = "interview_bot")
public class SessionAnswer {

    @Id @Column(nullable = false)
    private UUID id;

    @Column(name = "session_id", nullable = false)
    private UUID sessionId;

    @Column(name = "question", columnDefinition = "TEXT", nullable = false)
    private String question;

    @Column(name = "answer", columnDefinition = "TEXT")
    private String answer;

    @Column(name = "score")
    private Integer score;

    @Column(name = "feedback", columnDefinition = "TEXT")
    private String feedback;

    @Column(name = "improved_answer", columnDefinition = "TEXT")
    private String improvedAnswer;

    @Column(name = "clarity_score")
    private Double clarityScore;

    @Column(name = "clarity_justification", columnDefinition = "TEXT")
    private String clarityJustification;

    @Column(name = "depth_score")
    private Double depthScore;

    @Column(name = "depth_justification", columnDefinition = "TEXT")
    private String depthJustification;

    @Column(name = "quality_score")
    private Double qualityScore;

    @Column(name = "quality_justification", columnDefinition = "TEXT")
    private String qualityJustification;

    @Column(name = "is_followup")
    private boolean followup;

    @Column(name = "depth_level")
    private int depthLevel;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public SessionAnswer() {}

    public UUID getId()                           { return id; }
    public void setId(UUID id)                    { this.id = id; }
    public UUID getSessionId()                    { return sessionId; }
    public void setSessionId(UUID v)              { this.sessionId = v; }
    public String getQuestion()                   { return question; }
    public void setQuestion(String v)             { this.question = v; }
    public String getAnswer()                     { return answer; }
    public void setAnswer(String v)               { this.answer = v; }
    public Integer getScore()                     { return score; }
    public void setScore(Integer v)               { this.score = v; }
    public String getFeedback()                   { return feedback; }
    public void setFeedback(String v)             { this.feedback = v; }
    public String getImprovedAnswer()             { return improvedAnswer; }
    public void setImprovedAnswer(String v)       { this.improvedAnswer = v; }
    public Double getClarityScore()               { return clarityScore; }
    public void setClarityScore(Double v)         { this.clarityScore = v; }
    public String getClarityJustification()       { return clarityJustification; }
    public void setClarityJustification(String v) { this.clarityJustification = v; }
    public Double getDepthScore()                 { return depthScore; }
    public void setDepthScore(Double v)           { this.depthScore = v; }
    public String getDepthJustification()         { return depthJustification; }
    public void setDepthJustification(String v)   { this.depthJustification = v; }
    public Double getQualityScore()               { return qualityScore; }
    public void setQualityScore(Double v)         { this.qualityScore = v; }
    public String getQualityJustification()       { return qualityJustification; }
    public void setQualityJustification(String v) { this.qualityJustification = v; }
    public boolean isFollowup()                   { return followup; }
    public void setFollowup(boolean v)            { this.followup = v; }
    public int getDepthLevel()                    { return depthLevel; }
    public void setDepthLevel(int v)              { this.depthLevel = v; }
    public LocalDateTime getCreatedAt()           { return createdAt; }
    public void setCreatedAt(LocalDateTime v)     { this.createdAt = v; }
}
