package com.interviewprep.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "chat_sessions")
public class ChatSession {

    @Id @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private AppUser user;

    @Column(nullable = false)
    private Instant startedAt = Instant.now();

    private Instant lastMessageAt = Instant.now();

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt ASC")
    private List<ChatMessage> messages = new ArrayList<>();

    public UUID getId()                         { return id; }
    public void setId(UUID id)                  { this.id = id; }
    public AppUser getUser()                    { return user; }
    public void setUser(AppUser v)              { this.user = v; }
    public Instant getStartedAt()               { return startedAt; }
    public void setStartedAt(Instant v)         { this.startedAt = v; }
    public Instant getLastMessageAt()           { return lastMessageAt; }
    public void setLastMessageAt(Instant v)     { this.lastMessageAt = v; }
    public List<ChatMessage> getMessages()      { return messages; }
    public void setMessages(List<ChatMessage> v){ this.messages = v; }
}
