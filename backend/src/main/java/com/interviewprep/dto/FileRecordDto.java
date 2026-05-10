package com.interviewprep.dto;

import com.interviewprep.domain.FileRecord;

public class FileRecordDto {

    private String fileName;
    private String uploadedAt;

    public FileRecordDto() {}

    public FileRecordDto(String fileName, String uploadedAt) {
        this.fileName   = fileName;
        this.uploadedAt = uploadedAt;
    }

    public static FileRecordDto from(FileRecord r) {
        return new FileRecordDto(
            r.getFileName(),
            r.getUploadedAt() != null ? r.getUploadedAt().toString() : ""
        );
    }

    public String getFileName()   { return fileName; }
    public void   setFileName(String fileName)     { this.fileName = fileName; }

    public String getUploadedAt() { return uploadedAt; }
    public void   setUploadedAt(String uploadedAt) { this.uploadedAt = uploadedAt; }
}
