package com.interviewprep.service;

import com.interviewprep.domain.FileRecord;
import com.interviewprep.dto.BotDtos;
import com.interviewprep.repository.FileRecordRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class BotFileService {

    private final FileStorageService fileStorageService;
    private final FileRecordRepository fileRecordRepository;

    public BotFileService(FileStorageService fileStorageService, FileRecordRepository fileRecordRepository) {
        this.fileStorageService = fileStorageService;
        this.fileRecordRepository = fileRecordRepository;
    }

    public BotDtos.UploadResponse uploadFile(MultipartFile file, UUID userId) {
        String filePath = fileStorageService.saveFile(file, userId);

        FileRecord record = new FileRecord();
        record.setId(UUID.randomUUID());
        record.setUserId(userId);
        record.setFileName(file.getOriginalFilename());
        record.setFilePath(filePath);
        record.setUploadedAt(LocalDateTime.now());

        fileRecordRepository.save(record);

        return new BotDtos.UploadResponse(record.getId(), record.getFileName(), record.getUploadedAt());
    }

    public FileRecord getFileRecord(UUID fileId) {
        return fileRecordRepository.findById(fileId)
            .orElseThrow(() -> new RuntimeException("File not found: " + fileId));
    }
}
