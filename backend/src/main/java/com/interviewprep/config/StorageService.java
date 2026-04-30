package com.interviewprep.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class StorageService {

    private final Path rootLocation;

    public StorageService(@Value("${app.storage.path:./uploads}") String storagePath) throws IOException {
        this.rootLocation = Paths.get(storagePath).toAbsolutePath().normalize();
        Files.createDirectories(this.rootLocation);
    }

    public Path store(MultipartFile file) throws IOException {
        String original = file.getOriginalFilename();
        String ext = (original != null && original.contains("."))
                ? original.substring(original.lastIndexOf('.'))
                : "";
        String storedName = UUID.randomUUID() + ext;
        Path destination = rootLocation.resolve(storedName);
        Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);
        return destination;
    }

    public Resource load(String filePath) throws MalformedURLException {
        Path path = Paths.get(filePath);
        Resource resource = new UrlResource(path.toUri());
        if (resource.exists() && resource.isReadable()) return resource;
        throw new IllegalArgumentException("File not found: " + filePath);
    }

    public void delete(String filePath) {
        if (filePath == null || filePath.isBlank()) return;
        try { Files.deleteIfExists(Paths.get(filePath)); } catch (IOException ignored) {}
    }
}
