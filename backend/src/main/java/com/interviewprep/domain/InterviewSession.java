package com.interviewprep.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "interview_sessions", indexes = {
        @Index(name = "idx_session_user",    columnList = "user_id"),
        @Index(name = "idx_session_account", columnList = "account_id")
})
public class InterviewSession {

    @Id @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id")
    private Account account;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "role_id")
    private Role role;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private AppUser user;

    @Column(nullable = false)
    private Instant startedAt = Instant.now();

    private Instant completedAt;

    @Column(length = 4000)
    private String overallFeedback;

    private Double overallScore;

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orderIndex ASC")
    private List<Question> questions = new ArrayList<>();

    public UUID getId()                        { return id; }
    public void setId(UUID id)                 { this.id = id; }
    public Account getAccount()                { return account; }
    public void setAccount(Account v)          { this.account = v; }
    public Role getRole()                      { return role; }
    public void setRole(Role v)                { this.role = v; }
    public AppUser getUser()                   { return user; }
    public void setUser(AppUser v)             { this.user = v; }
    public Instant getStartedAt()              { return startedAt; }
    public void setStartedAt(Instant v)        { this.startedAt = v; }
    public Instant getCompletedAt()            { return completedAt; }
    public void setCompletedAt(Instant v)      { this.completedAt = v; }
    public String getOverallFeedback()         { return overallFeedback; }
    public void setOverallFeedback(String v)   { this.overallFeedback = v; }
    public Double getOverallScore()            { return overallScore; }
    public void setOverallScore(Double v)      { this.overallScore = v; }
    public List<Question> getQuestions()       { return questions; }
    public void setQuestions(List<Question> v) { this.questions = v; }
}
