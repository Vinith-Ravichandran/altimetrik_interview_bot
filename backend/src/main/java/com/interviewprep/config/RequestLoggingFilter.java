package com.interviewprep.config;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.UUID;

@Component
@Order(1)
public class RequestLoggingFilter implements Filter {

    private static final Logger log = LoggerFactory.getLogger(RequestLoggingFilter.class);
    private static final String REQUEST_ID_KEY = "requestId";

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest  httpReq  = (HttpServletRequest)  request;
        HttpServletResponse httpResp = (HttpServletResponse) response;

        String requestId = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        MDC.put(REQUEST_ID_KEY, requestId);

        long start = System.currentTimeMillis();
        String method = httpReq.getMethod();
        String uri    = httpReq.getRequestURI();

        log.info("[REQUEST] --> {} {}", method, uri);

        try {
            chain.doFilter(request, response);
            long ms = System.currentTimeMillis() - start;
            log.info("[REQUEST] <-- {} {} | status={} | {}ms", method, uri, httpResp.getStatus(), ms);
        } catch (Exception e) {
            long ms = System.currentTimeMillis() - start;
            log.error("[REQUEST] <-- {} {} | FAILED in {}ms | {}", method, uri, ms, e.getMessage());
            throw e;
        } finally {
            MDC.clear();
        }
    }
}
