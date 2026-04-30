package com.interviewprep.config;

import com.interviewprep.domain.AppUser;
import com.interviewprep.repository.AppUserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class DataInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);
    private static final String ADMIN_EMAIL = "admin@interviewprep.com";

    private final AppUserRepository userRepo;
    private final PasswordEncoder   passwordEncoder;

    public DataInitializer(AppUserRepository userRepo, PasswordEncoder passwordEncoder) {
        this.userRepo        = userRepo;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (userRepo.count() == 0) {
            AppUser admin = new AppUser();
            admin.setName("admin");
            admin.setEmail(ADMIN_EMAIL);
            admin.setPasswordHash(passwordEncoder.encode("admin123"));
            admin.setAdmin(true);
            admin.setRoleName("ADMIN");
            admin.setAccountName("System");
            userRepo.save(admin);
            log.info("Default admin created — email: {}, password: admin123", ADMIN_EMAIL);
        } else {
            // Patch existing admin if it has no email set
            userRepo.findByName("admin").ifPresent(admin -> {
                if (admin.getEmail() == null) {
                    admin.setEmail(ADMIN_EMAIL);
                    userRepo.save(admin);
                    log.info("Patched admin email to {}", ADMIN_EMAIL);
                }
            });
        }
    }
}
