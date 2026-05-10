package com.interviewprep.domain;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "questions", schema = "app")
public class Question {

    @Id @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id")
    private InterviewSession session;

    @Column(nullable = false)
    private int orderIndex;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String text;

    @OneToOne(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true)
    private Answer answer;

    public UUID getId()                        { return id; }
    public void setId(UUID id)                 { this.id = id; }
    public InterviewSession getSession()       { return session; }
    public void setSession(InterviewSession v) { this.session = v; }
    public int getOrderIndex()                 { return orderIndex; }
    public void setOrderIndex(int v)           { this.orderIndex = v; }
    public String getText()                    { return text; }
    public void setText(String v)              { this.text = v; }
    public Answer getAnswer()                  { return answer; }
    public void setAnswer(Answer v)            { this.answer = v; }
}
