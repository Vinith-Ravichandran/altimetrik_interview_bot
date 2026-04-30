package com.interviewprep.service;

import com.interviewprep.domain.Account;
import com.interviewprep.domain.Role;
import com.interviewprep.dto.Dtos.AccountDto;
import com.interviewprep.dto.Dtos.AccountWithRolesRequest;
import com.interviewprep.repository.AccountRepository;
import com.interviewprep.repository.RoleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountService {

    private final AccountRepository accountRepository;
    private final RoleRepository roleRepository;

    public AccountService(AccountRepository accountRepository, RoleRepository roleRepository) {
        this.accountRepository = accountRepository;
        this.roleRepository = roleRepository;
    }

    @Transactional
    public AccountDto createWithRoles(AccountWithRolesRequest req) {
        Account account = new Account();
        account.setName(req.accountName().trim());
        account.setLogoUrl(req.logoUrl() != null ? req.logoUrl().trim() : null);
        accountRepository.save(account);

        if (req.roles() != null) {
            for (String roleName : req.roles()) {
                if (roleName == null || roleName.isBlank()) continue;
                Role role = new Role();
                role.setName(roleName.trim());
                role.setAccount(account);
                Role saved = roleRepository.save(role);
                account.getRoles().add(saved);
            }
        }

        return AccountDto.of(account);
    }
}
