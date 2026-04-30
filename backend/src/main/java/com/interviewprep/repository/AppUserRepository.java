package com.interviewprep.repository;

import com.interviewprep.domain.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AppUserRepository extends JpaRepository<AppUser, UUID> {
    Optional<AppUser> findByName(String name);
    Optional<AppUser> findByEmail(String email);
    boolean existsByName(String name);
    boolean existsByEmail(String email);
}
