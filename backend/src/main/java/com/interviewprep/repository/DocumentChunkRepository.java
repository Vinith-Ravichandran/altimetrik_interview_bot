package com.interviewprep.repository;

import com.interviewprep.domain.DocumentChunk;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface DocumentChunkRepository extends JpaRepository<DocumentChunk, UUID> {

    @Query(value = "SELECT * FROM app.document_chunks WHERE text ILIKE CONCAT('%', :term, '%')",
           nativeQuery = true)
    List<DocumentChunk> searchByTerm(@Param("term") String term);
}
