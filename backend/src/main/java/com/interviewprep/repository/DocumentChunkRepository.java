package com.interviewprep.repository;

import com.interviewprep.domain.DocumentChunk;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface DocumentChunkRepository extends JpaRepository<DocumentChunk, UUID> {

    @Query("select c from DocumentChunk c where lower(c.text) like lower(concat('%', :term, '%'))")
    List<DocumentChunk> searchByTerm(String term);
}
