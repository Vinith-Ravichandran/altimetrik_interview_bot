package com.interviewprep.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "app_users", indexes = {
        @Index(name = "idx_user_name",  columnList = "name"),
        @Index(name = "idx_user_email", columnList = "email")
})
public class AppUser {

    @Id @GeneratedValue
    private UUID id;

    @Column(nullable = false, unique = true, length = 255)
    private String name;

    @Column(unique = true, length = 255)
    private String email;

    @Column(nullable = false, length = 255)
    private String passwordHash;

    @Column(length = 255)
    private String roleName;

    @Column(length = 255)
    private String accountName;

    @Column(nullable = false)
    private boolean admin = false;

    @Column(nullable = false)
    private boolean active = true;

    @Column(nullable = false)
    private int mockCount = 0;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    @Column(nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    void onUpdate() { this.updatedAt = Instant.now(); }

    public UUID getId()                   { return id; }
    public void setId(UUID id)            { this.id = id; }
    public String getName()               { return name; }
    public void setName(String v)         { this.name = v; }
    public String getEmail()              { return email; }
    public void setEmail(String v)        { this.email = v; }
    public String getPasswordHash()       { return passwordHash; }
    public void setPasswordHash(String v) { this.passwordHash = v; }
    public String getRoleName()           { return roleName; }
    public void setRoleName(String v)     { this.roleName = v; }
    public String getAccountName()        { return accountName; }
    public void setAccountName(String v)  { this.accountName = v; }
    public boolean isAdmin()              { return admin; }
    public void setAdmin(boolean v)       { this.admin = v; }
    public boolean isActive()             { return active; }
    public void setActive(boolean v)      { this.active = v; }
    public int getMockCount()             { return mockCount; }
    public void setMockCount(int v)       { this.mockCount = v; }
    public Instant getCreatedAt()         { return createdAt; }
    public void setCreatedAt(Instant v)   { this.createdAt = v; }
    public Instant getUpdatedAt()         { return updatedAt; }
    public void setUpdatedAt(Instant v)   { this.updatedAt = v; }
}
