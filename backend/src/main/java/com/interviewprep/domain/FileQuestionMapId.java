package com.interviewprep.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

@Embeddable
public class FileQuestionMapId implements Serializable {

    @Column(name = "file_id")
    private UUID fileId;

    @Column(name = "question_id")
    private UUID questionId;

    public FileQuestionMapId() {}

    public FileQuestionMapId(UUID fileId, UUID questionId) {
        this.fileId = fileId;
        this.questionId = questionId;
    }

    public UUID getFileId() { return fileId; }
    public void setFileId(UUID fileId) { this.fileId = fileId; }

    public UUID getQuestionId() { return questionId; }
    public void setQuestionId(UUID questionId) { this.questionId = questionId; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof FileQuestionMapId that)) return false;
        return Objects.equals(fileId, that.fileId) && Objects.equals(questionId, that.questionId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(fileId, questionId);
    }
}
