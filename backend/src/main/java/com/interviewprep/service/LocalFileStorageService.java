package com.interviewprep.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
public class LocalFileStorageService implements FileStorageService {

    @Value("${app.storage.path:./uploads}")
    private String storagePath;

    @Override
    public String saveFile(MultipartFile file, UUID userId) {
        try {
            UUID fileId = UUID.randomUUID();
            String original = file.getOriginalFilename();
            String ext = (original != null && original.contains("."))
                ? original.substring(original.lastIndexOf('.'))
                : "";

            Path userDir = Paths.get(storagePath, userId.toString());
            Files.createDirectories(userDir);

            Path target = userDir.resolve(fileId + ext);
            file.transferTo(target.toFile());

            return target.toString();
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file: " + e.getMessage(), e);
        }
    }

    @Override
    public Resource loadFile(String path) {
        try {
            Path filePath = Paths.get(path);
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            }
            throw new RuntimeException("File not found: " + path);
        } catch (Exception e) {
            throw new RuntimeException("Failed to load file: " + e.getMessage(), e);
        }
    }
}
