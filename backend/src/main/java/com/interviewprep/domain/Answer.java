package com.interviewprep.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "answers")
public class Answer {

    @Id @GeneratedValue
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "question_id")
    private Question question;

    @Lob
    @Column(columnDefinition = "CLOB", nullable = false)
    private String text;

    @Column(nullable = false)
    private Instant submittedAt = Instant.now();

    @OneToOne(mappedBy = "answer", cascade = CascadeType.ALL, orphanRemoval = true)
    private Evaluation evaluation;

    public UUID getId()                  { return id; }
    public void setId(UUID id)           { this.id = id; }
    public Question getQuestion()        { return question; }
    public void setQuestion(Question v)  { this.question = v; }
    public String getText()              { return text; }
    public void setText(String v)        { this.text = v; }
    public Instant getSubmittedAt()      { return submittedAt; }
    public void setSubmittedAt(Instant v){ this.submittedAt = v; }
    public Evaluation getEvaluation()    { return evaluation; }
    public void setEvaluation(Evaluation v){ this.evaluation = v; }
}
