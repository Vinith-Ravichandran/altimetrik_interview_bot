package com.interviewprep.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@Order(1)
public class BotSchemaInitializer implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    public BotSchemaInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        jdbcTemplate.execute("CREATE SCHEMA IF NOT EXISTS app");
        jdbcTemplate.execute("CREATE SCHEMA IF NOT EXISTS interview_bot");
    }
}
