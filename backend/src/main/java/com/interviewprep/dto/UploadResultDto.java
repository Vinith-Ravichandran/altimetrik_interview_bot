package com.interviewprep.dto;

import java.util.List;

public class UploadResultDto {

    private int totalExtracted;
    private int totalUnique;
    private List<CategorizedQuestion> questions;
    private List<FileRecordDto>       files;

    public UploadResultDto() {}

    public UploadResultDto(int totalExtracted, int totalUnique,
                           List<CategorizedQuestion> questions, List<FileRecordDto> files) {
        this.totalExtracted = totalExtracted;
        this.totalUnique    = totalUnique;
        this.questions      = questions;
        this.files          = files;
    }

    public int getTotalExtracted() { return totalExtracted; }
    public void setTotalExtracted(int v) { this.totalExtracted = v; }

    public int getTotalUnique() { return totalUnique; }
    public void setTotalUnique(int v) { this.totalUnique = v; }

    public List<CategorizedQuestion> getQuestions() { return questions; }
    public void setQuestions(List<CategorizedQuestion> v) { this.questions = v; }

    public List<FileRecordDto> getFiles() { return files; }
    public void setFiles(List<FileRecordDto> v) { this.files = v; }
}
