package com.ticketstream.domain.payment;

import lombok.*;

public class PaymentRequest {

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Process {
        private Long orderId;
        private Long amount;
    }
}
