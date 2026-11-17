package com.ticketstream.domain.order;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false)
    private Long concertId;

    @Column(nullable = false)
    private Long seatId;

    private Long amount;

    @Column(nullable = false)
    private String status; // PENDING, COMPLETED, CANCELLED

    private LocalDateTime createdAt;
}
