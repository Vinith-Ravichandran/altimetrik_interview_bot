package com.interviewprep.api;

import com.interviewprep.dto.Dtos.RoleDto;
import com.interviewprep.repository.RoleRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/roles")
public class RoleController {

    private final RoleRepository repository;

    public RoleController(RoleRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<RoleDto> list(@RequestParam(required = false) UUID accountId) {
        if (accountId != null) {
            return repository.findByAccount_Id(accountId).stream().map(RoleDto::of).toList();
        }
        return repository.findAll().stream().map(RoleDto::of).toList();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public void delete(@PathVariable UUID id) {
        repository.deleteById(id);
    }
}
