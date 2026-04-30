package com.interviewprep.api;

import com.interviewprep.config.JwtService;
import com.interviewprep.domain.AppUser;
import com.interviewprep.dto.Dtos.LoginRequest;
import com.interviewprep.dto.Dtos.RegisterRequest;
import com.interviewprep.dto.Dtos.TokenResponse;
import com.interviewprep.repository.AppUserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AppUserRepository userRepo;
    private final PasswordEncoder   passwordEncoder;
    private final JwtService        jwtService;

    public AuthController(AppUserRepository userRepo,
                          PasswordEncoder passwordEncoder,
                          JwtService jwtService) {
        this.userRepo        = userRepo;
        this.passwordEncoder = passwordEncoder;
        this.jwtService      = jwtService;
    }

    @PostMapping("/login")
    public TokenResponse login(@RequestBody LoginRequest req) {
        AppUser user = userRepo.findByEmail(req.email())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        return toTokenResponse(user);
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public TokenResponse register(@RequestBody RegisterRequest req) {
        if (req.name() == null || req.name().isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Name is required");
        if (req.email() == null || !req.email().contains("@"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Valid email is required");
        if (req.password() == null || req.password().length() < 6)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be at least 6 characters");

        if (userRepo.existsByEmail(req.email().toLowerCase().trim()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        if (userRepo.existsByName(req.name().trim()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already taken");

        AppUser user = new AppUser();
        user.setName(req.name().trim());
        user.setEmail(req.email().toLowerCase().trim());
        user.setPasswordHash(passwordEncoder.encode(req.password()));
        user.setAdmin(false);
        userRepo.save(user);

        return toTokenResponse(user);
    }

    private TokenResponse toTokenResponse(AppUser user) {
        String token = jwtService.generateToken(user);
        return new TokenResponse(token, user.getId(), user.getName(), user.getEmail(),
                user.getRoleName(), user.isAdmin());
    }
}
