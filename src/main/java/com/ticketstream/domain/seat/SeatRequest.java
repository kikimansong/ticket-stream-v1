package com.ticketstream.domain.seat;

import com.ticketstream.global.enums.LockType;
import lombok.*;

public class SeatRequest {

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Reserve {
        private Long seatId;
        private LockType lockType;
    }
}
