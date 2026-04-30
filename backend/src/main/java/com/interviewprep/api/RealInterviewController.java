package com.interviewprep.api;

import com.interviewprep.dto.Dtos.RealInterviewLogDto;
import com.interviewprep.dto.Dtos.RealInterviewRequest;
import com.interviewprep.service.RealInterviewService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/real-interviews")
public class RealInterviewController {

    private final RealInterviewService service;

    public RealInterviewController(RealInterviewService service) {
        this.service = service;
    }

    @PostMapping
    public RealInterviewLogDto log(@RequestBody RealInterviewRequest req) {
        return RealInterviewLogDto.of(service.log(req.accountId(), req.panelistName(), req.questions()));
    }

    @GetMapping
    public List<RealInterviewLogDto> list() {
        return service.list().stream().map(RealInterviewLogDto::of).toList();
    }
}
