package com.interviewprep.service;

import com.interviewprep.domain.Account;
import com.interviewprep.domain.RealInterviewLog;
import com.interviewprep.domain.RealInterviewQuestion;
import com.interviewprep.repository.AccountRepository;
import com.interviewprep.repository.RealInterviewLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class RealInterviewService {

    private final RealInterviewLogRepository logRepository;
    private final AccountRepository accountRepository;
    private final ClassificationService classificationService;

    public RealInterviewService(RealInterviewLogRepository logRepository,
                                AccountRepository accountRepository,
                                ClassificationService classificationService) {
        this.logRepository = logRepository;
        this.accountRepository = accountRepository;
        this.classificationService = classificationService;
    }

    @Transactional
    public RealInterviewLog log(UUID accountId, String panelistName, List<String> questions) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new IllegalArgumentException("Account not found"));

        RealInterviewLog log = new RealInterviewLog();
        log.setAccount(account);
        log.setPanelistName(panelistName);

        for (String text : questions) {
            ClassificationService.Classification c = classificationService.classify(text);
            RealInterviewQuestion q = new RealInterviewQuestion();
            q.setLog(log);
            q.setText(text);
            q.setDomain(c.domain());
            q.setService(c.service());
            q.setDifficulty(c.difficulty());
            log.getQuestions().add(q);
        }

        return logRepository.save(log);
    }

    public List<RealInterviewLog> list() {
        return logRepository.findAll();
    }
}
