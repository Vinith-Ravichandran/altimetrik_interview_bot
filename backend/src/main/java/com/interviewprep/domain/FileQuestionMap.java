package com.interviewprep.domain;

import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "file_question_map", schema = "interview_bot")
public class FileQuestionMap {

    @EmbeddedId
    private FileQuestionMapId id;

    public FileQuestionMap() {}

    public FileQuestionMap(FileQuestionMapId id) {
        this.id = id;
    }

    public FileQuestionMapId getId() { return id; }
    public void setId(FileQuestionMapId id) { this.id = id; }
}
