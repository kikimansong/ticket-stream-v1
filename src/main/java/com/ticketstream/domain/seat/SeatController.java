package com.ticketstream.domain.seat;

import com.ticketstream.global.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/seats")
@RequiredArgsConstructor
public class SeatController {

    private final SeatService seatService;

    @GetMapping
    public ApiResponse<List<SeatResponse.List>> getSeats(@RequestParam Long concertId) {
        return ApiResponse.ok(seatService.getSeatsByConcert(concertId));
    }

    @GetMapping("/{id}")
    public ApiResponse<SeatResponse.Detail> getSeatDetail(@PathVariable Long id) {
        return ApiResponse.ok(seatService.getSeatDetail(id));
    }

    @PostMapping("/reset/{concertId}")
    public ApiResponse<String> resetSeats(@PathVariable Long concertId) {
        seatService.resetSeats(concertId);
        return ApiResponse.ok("좌석 및 관련 주문/결제 내역이 모두 초기화되었습니다.", "RESET_SUCCESS");
    }
}
