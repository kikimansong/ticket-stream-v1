package com.ticketstream.domain.order;

import com.ticketstream.global.enums.LockType;
import lombok.*;

public class OrderRequest {

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Create {
        private Long userId;
        private Long concertId;
        private Long seatId;
        private LockType lockType;
    }
}
