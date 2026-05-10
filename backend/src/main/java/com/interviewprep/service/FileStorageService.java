package com.interviewprep.service;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;
import java.util.UUID;

public interface FileStorageService {

    String saveFile(MultipartFile file, UUID userId);

    Resource loadFile(String path);
}
