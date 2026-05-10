package com.interviewprep.domain;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "real_interview_questions", schema = "app")
public class RealInterviewQuestion {

    @Id @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "log_id")
    private RealInterviewLog log;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String text;

    private String domain;
    private String service;
    private String difficulty;

    public UUID getId()                      { return id; }
    public void setId(UUID id)               { this.id = id; }
    public RealInterviewLog getLog()         { return log; }
    public void setLog(RealInterviewLog v)   { this.log = v; }
    public String getText()                  { return text; }
    public void setText(String v)            { this.text = v; }
    public String getDomain()                { return domain; }
    public void setDomain(String v)          { this.domain = v; }
    public String getService()               { return service; }
    public void setService(String v)         { this.service = v; }
    public String getDifficulty()            { return difficulty; }
    public void setDifficulty(String v)      { this.difficulty = v; }
}
