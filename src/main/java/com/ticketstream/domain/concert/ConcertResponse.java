package com.ticketstream.domain.concert;

import java.time.LocalDateTime;

public class ConcertResponse {

    public record List(
            Long id,
            String title,
            String venue,
            LocalDateTime concertDate,
            int totalSeats
    ) {}

    public record Detail(
            Long id,
            String title,
            String venue,
            LocalDateTime concertDate,
            int totalSeats
    ) {}
}
