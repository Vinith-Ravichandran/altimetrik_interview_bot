package com.interviewprep.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "documents", schema = "app")
public class Document {

    @Id @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    private String filename;

    @Column(nullable = false)
    private String contentType;

    private long sizeBytes;

    @Column(length = 1000)
    private String filePath;

    @Column(length = 255)
    private String accountName;

    @Column(length = 255)
    private String roleName;

    @Column(length = 255)
    private String category;

    @Column(length = 1000)
    private String tags;

    @Column(columnDefinition = "TEXT")
    private String extractedText;

    @Column(nullable = false)
    private Instant uploadedAt = Instant.now();

    public UUID getId()                  { return id; }
    public void setId(UUID id)           { this.id = id; }
    public String getFilename()          { return filename; }
    public void setFilename(String v)    { this.filename = v; }
    public String getContentType()       { return contentType; }
    public void setContentType(String v) { this.contentType = v; }
    public long getSizeBytes()           { return sizeBytes; }
    public void setSizeBytes(long v)     { this.sizeBytes = v; }
    public String getFilePath()          { return filePath; }
    public void setFilePath(String v)    { this.filePath = v; }
    public String getAccountName()       { return accountName; }
    public void setAccountName(String v) { this.accountName = v; }
    public String getRoleName()          { return roleName; }
    public void setRoleName(String v)    { this.roleName = v; }
    public String getCategory()          { return category; }
    public void setCategory(String v)    { this.category = v; }
    public String getTags()              { return tags; }
    public void setTags(String v)        { this.tags = v; }
    public String getExtractedText()     { return extractedText; }
    public void setExtractedText(String v){ this.extractedText = v; }
    public Instant getUploadedAt()       { return uploadedAt; }
    public void setUploadedAt(Instant v) { this.uploadedAt = v; }
}
