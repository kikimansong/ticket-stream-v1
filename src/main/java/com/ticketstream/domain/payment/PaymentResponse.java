package com.ticketstream.domain.payment;

import java.time.LocalDateTime;

public class PaymentResponse {

    public record Detail(
            Long paymentId,
            Long orderId,
            Long amount,
            String status,
            LocalDateTime paymentDate
    ) {}
}
