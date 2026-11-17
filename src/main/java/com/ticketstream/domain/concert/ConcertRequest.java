package com.ticketstream.domain.concert;

import lombok.*;

import java.time.LocalDateTime;

public class ConcertRequest {

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Create {
        private String title;
        private String venue;
        private LocalDateTime concertDate;
        private int totalSeats;
    }

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Update {
        private String title;
        private String venue;
        private LocalDateTime concertDate;
    }
}
