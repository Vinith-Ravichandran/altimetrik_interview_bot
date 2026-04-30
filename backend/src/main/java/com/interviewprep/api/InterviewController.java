package com.interviewprep.api;

import com.interviewprep.domain.InterviewSession;
import com.interviewprep.dto.Dtos.*;
import com.interviewprep.service.InterviewService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/interviews")
public class InterviewController {

    private final InterviewService interviewService;

    public InterviewController(InterviewService interviewService) {
        this.interviewService = interviewService;
    }

    @PostMapping
    public InterviewSessionDto start(@RequestBody StartInterviewRequest req) {
        return InterviewSessionDto.of(interviewService.start(req.accountId(), req.roleId()));
    }

    @GetMapping
    public List<InterviewSessionDto> list() {
        return interviewService.list().stream().map(InterviewSessionDto::of).toList();
    }

    @GetMapping("/{id}")
    public InterviewSessionDto get(@PathVariable UUID id) {
        return InterviewSessionDto.of(interviewService.get(id));
    }

    @PostMapping("/{id}/next-question")
    public QuestionDto nextQuestion(@PathVariable UUID id) {
        InterviewSession session = interviewService.get(id);
        return QuestionDto.of(interviewService.generateNextQuestion(session));
    }

    @PostMapping("/questions/{questionId}/answer")
    public AnswerDto submitAnswer(@PathVariable UUID questionId, @RequestBody SubmitAnswerRequest req) {
        return AnswerDto.of(interviewService.submitAnswer(questionId, req.text()));
    }

    @PostMapping("/{id}/finish")
    public InterviewSessionDto finish(@PathVariable UUID id) {
        return InterviewSessionDto.of(interviewService.finish(id));
    }
}
