package com.interviewprep.domain;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "document_chunks", indexes = {
        @Index(name = "idx_chunk_document", columnList = "document_id")
})
public class DocumentChunk {

    @Id @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "document_id")
    private Document document;

    private int chunkIndex;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String text;

    public UUID getId()                  { return id; }
    public void setId(UUID id)           { this.id = id; }
    public Document getDocument()        { return document; }
    public void setDocument(Document v)  { this.document = v; }
    public int getChunkIndex()           { return chunkIndex; }
    public void setChunkIndex(int v)     { this.chunkIndex = v; }
    public String getText()              { return text; }
    public void setText(String v)        { this.text = v; }
}
