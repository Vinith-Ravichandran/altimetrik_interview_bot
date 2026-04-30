package com.interviewprep.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "real_interview_logs")
public class RealInterviewLog {

    @Id @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id")
    private Account account;

    private String panelistName;

    @Column(nullable = false)
    private Instant loggedAt = Instant.now();

    @OneToMany(mappedBy = "log", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<RealInterviewQuestion> questions = new ArrayList<>();

    public UUID getId()                                   { return id; }
    public void setId(UUID id)                            { this.id = id; }
    public Account getAccount()                           { return account; }
    public void setAccount(Account v)                     { this.account = v; }
    public String getPanelistName()                       { return panelistName; }
    public void setPanelistName(String v)                 { this.panelistName = v; }
    public Instant getLoggedAt()                          { return loggedAt; }
    public void setLoggedAt(Instant v)                    { this.loggedAt = v; }
    public List<RealInterviewQuestion> getQuestions()     { return questions; }
    public void setQuestions(List<RealInterviewQuestion> v){ this.questions = v; }
}
