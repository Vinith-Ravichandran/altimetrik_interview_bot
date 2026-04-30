package com.interviewprep.api;

import com.interviewprep.dto.Dtos.*;
import com.interviewprep.repository.AppUserRepository;
import com.interviewprep.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService          userService;
    private final AppUserRepository    userRepo;

    public UserController(UserService userService, AppUserRepository userRepo) {
        this.userService = userService;
        this.userRepo    = userRepo;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<UserDto> list() {
        return userService.list();
    }

    @GetMapping("/me")
    public UserDto me(@AuthenticationPrincipal String userId) {
        if (userId == null)
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        return userService.getById(UUID.fromString(userId));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public UserDto get(@PathVariable UUID id) {
        return userService.getById(id);
    }

    @GetMapping("/{id}/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public UserStatsDto stats(@PathVariable UUID id) {
        return userService.stats(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public UserDto create(@RequestBody CreateUserRequest req) {
        return userService.create(req);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public UserDto update(@PathVariable UUID id, @RequestBody UpdateUserRequest req) {
        return userService.update(id, req);
    }

    @PatchMapping("/{id}/promote")
    @PreAuthorize("hasRole('ADMIN')")
    public UserDto promote(@PathVariable UUID id) {
        return userService.promoteToAdmin(id);
    }

    @PatchMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public UserDto deactivate(@PathVariable UUID id) {
        return userService.setActive(id, false);
    }

    @PatchMapping("/{id}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    public UserDto activate(@PathVariable UUID id) {
        return userService.setActive(id, true);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void delete(@PathVariable UUID id) {
        userService.delete(id);
    }
}
