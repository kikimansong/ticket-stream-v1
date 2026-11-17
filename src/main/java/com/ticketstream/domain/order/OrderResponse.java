package com.ticketstream.domain.order;

import java.time.LocalDateTime;

public class OrderResponse {

    public record Detail(
            Long orderId,
            Long seatId,
            Long amount,
            String status,
            LocalDateTime createdAt,
            String message
    ) {}

    public record List(
            Long orderId,
            Long userId,
            Long concertId,
            Long seatId,
            Long amount,
            String status,
            LocalDateTime createdAt
    ) {}
}
