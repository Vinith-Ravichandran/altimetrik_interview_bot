package com.interviewprep.repository;

import com.interviewprep.domain.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RoleRepository extends JpaRepository<Role, UUID> {
    List<Role> findByAccount_Id(UUID accountId);
}
