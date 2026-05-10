package com.interviewprep.repository;

import com.interviewprep.domain.FileQuestionMap;
import com.interviewprep.domain.FileQuestionMapId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface FileQuestionMapRepository extends JpaRepository<FileQuestionMap, FileQuestionMapId> {

    List<FileQuestionMap> findByIdFileId(UUID fileId);
}
