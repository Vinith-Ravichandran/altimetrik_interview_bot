package com.interviewprep.api;

import com.interviewprep.dto.Dtos.AccountDto;
import com.interviewprep.dto.Dtos.AccountWithRolesRequest;
import com.interviewprep.service.AccountService;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminController {

    private final AccountService accountService;

    public AdminController(AccountService accountService) {
        this.accountService = accountService;
    }

    @PostMapping("/accounts-with-roles")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public AccountDto createAccountWithRoles(@RequestBody AccountWithRolesRequest req) {
        return accountService.createWithRoles(req);
    }
}
