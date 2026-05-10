package com.interviewprep.api;

import com.interviewprep.domain.Account;
import com.interviewprep.domain.Role;
import com.interviewprep.dto.Dtos.AccountDto;
import com.interviewprep.repository.AccountRepository;
import com.interviewprep.repository.RoleRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/accounts")
public class AccountController {

    private final AccountRepository repository;
    private final RoleRepository    roleRepository;

    public AccountController(AccountRepository repository, RoleRepository roleRepository) {
        this.repository     = repository;
        this.roleRepository = roleRepository;
    }

    @GetMapping
    public List<AccountDto> list() {
        return repository.findAll().stream().map(AccountDto::of).toList();
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AccountDto> update(@PathVariable UUID id,
                                             @RequestBody Map<String, String> body) {
        Account account = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Account not found: " + id));
        if (body.containsKey("name") && body.get("name") != null && !body.get("name").isBlank()) {
            account.setName(body.get("name").trim());
        }
        if (body.containsKey("logoUrl")) {
            account.setLogoUrl(body.get("logoUrl") == null || body.get("logoUrl").isBlank()
                    ? null : body.get("logoUrl").trim());
        }
        return ResponseEntity.ok(AccountDto.of(repository.save(account)));
    }

    @PostMapping("/{id}/roles")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AccountDto> addRole(@PathVariable UUID id,
                                              @RequestBody Map<String, String> body) {
        Account account = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Account not found: " + id));
        String roleName = body.get("name");
        if (roleName == null || roleName.isBlank()) {
            throw new IllegalArgumentException("Role name must not be blank");
        }
        Role role = new Role();
        role.setName(roleName.trim());
        role.setAccount(account);
        roleRepository.save(role);
        account.getRoles().add(role);
        return ResponseEntity.ok(AccountDto.of(repository.save(account)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public void delete(@PathVariable UUID id) {
        repository.deleteById(id);
    }
}
