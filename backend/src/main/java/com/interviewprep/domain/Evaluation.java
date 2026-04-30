package com.interviewprep.domain;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "evaluations")
public class Evaluation {

    @Id @GeneratedValue
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "answer_id")
    private Answer answer;

    private double clarity;
    private double depth;
    private double quality;
    private double overall;

    @Column(length = 2000)
    private String strengths;

    @Column(length = 2000)
    private String improvements;

    public UUID getId()                    { return id; }
    public void setId(UUID id)             { this.id = id; }
    public Answer getAnswer()              { return answer; }
    public void setAnswer(Answer v)        { this.answer = v; }
    public double getClarity()             { return clarity; }
    public void setClarity(double v)       { this.clarity = v; }
    public double getDepth()               { return depth; }
    public void setDepth(double v)         { this.depth = v; }
    public double getQuality()             { return quality; }
    public void setQuality(double v)       { this.quality = v; }
    public double getOverall()             { return overall; }
    public void setOverall(double v)       { this.overall = v; }
    public String getStrengths()           { return strengths; }
    public void setStrengths(String v)     { this.strengths = v; }
    public String getImprovements()        { return improvements; }
    public void setImprovements(String v)  { this.improvements = v; }
}
