package com.ticketstream.domain.seat;

import com.ticketstream.global.enums.SeatStatus;

public class SeatResponse {

    public record List(
            Long id,
            Long concertId,
            String seatNumber,
            SeatStatus status,
            Long price,
            Long version
    ) {}

    public record Detail(
            Long id,
            Long concertId,
            String seatNumber,
            SeatStatus status,
            Long price,
            Long version
    ) {}
}
