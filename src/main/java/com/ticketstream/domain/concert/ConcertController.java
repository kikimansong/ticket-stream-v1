package com.ticketstream.domain.concert;

import com.ticketstream.global.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/concerts")
@RequiredArgsConstructor
public class ConcertController {

    private final ConcertService concertService;

    @GetMapping
    public ApiResponse<List<ConcertResponse.List>> getConcerts() {
        return ApiResponse.ok(concertService.getAllConcerts());
    }

    @GetMapping("/{id}")
    public ApiResponse<ConcertResponse.Detail> getConcert(@PathVariable Long id) {
        return ApiResponse.ok(concertService.getConcert(id));
    }
}
