package com.interviewprep.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "chat_messages", schema = "app", indexes = {
        @Index(name = "idx_msg_session", columnList = "session_id")
})
public class ChatMessage {

    public enum Role { USER, ASSISTANT }

    @Id @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private ChatSession session;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(length = 50)
    private String intent;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    public UUID getId()                    { return id; }
    public void setId(UUID id)             { this.id = id; }
    public ChatSession getSession()        { return session; }
    public void setSession(ChatSession v)  { this.session = v; }
    public Role getRole()                  { return role; }
    public void setRole(Role v)            { this.role = v; }
    public String getContent()             { return content; }
    public void setContent(String v)       { this.content = v; }
    public String getIntent()              { return intent; }
    public void setIntent(String v)        { this.intent = v; }
    public Instant getCreatedAt()          { return createdAt; }
    public void setCreatedAt(Instant v)    { this.createdAt = v; }
}
