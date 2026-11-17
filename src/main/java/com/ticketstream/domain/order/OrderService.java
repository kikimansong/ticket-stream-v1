package com.ticketstream.domain.order;

import com.ticketstream.domain.payment.PaymentService;
import com.ticketstream.global.enums.LockType;
import com.ticketstream.domain.seat.Seat;
import com.ticketstream.domain.seat.SeatRepository;
import com.ticketstream.domain.seat.SeatService;
import com.ticketstream.global.enums.SeatStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService {

    private final SeatService seatService;
    private final SeatRepository seatRepository;
    private final PaymentService paymentService;
    private final OrderRepository orderRepository;

    @Transactional
    public OrderResponse.Detail createOrder(OrderRequest.Create request) {
        log.info("주문 생성 요청: userId={}, concertId={}, seatId={}, lockType={}",
                request.getUserId(), request.getConcertId(), request.getSeatId(), request.getLockType());

        LockType lockType = request.getLockType() != null ? request.getLockType() : LockType.NONE;

        // 1. 좌석 선점 (동시성 락 전략 적용)
        Seat seat = seatService.reserveSeat(request.getSeatId(), lockType);

        // 2. 가주문(PENDING) 생성
        Order order = Order.builder()
                .userId(request.getUserId())
                .concertId(request.getConcertId())
                .seatId(seat.getId())
                .amount(seat.getPrice())
                .status("PENDING")
                .createdAt(LocalDateTime.now())
                .build();

        order = orderRepository.save(order);

        // 3. 결제 처리
        paymentService.processPayment(order.getId(), seat.getPrice());

        // 4. 주문 완료 및 좌석 판매 확정
        order.setStatus("COMPLETED");

        if (lockType == LockType.NONE) {
            seatRepository.updateStatusWithoutLock(seat.getId(), SeatStatus.SOLD.name());
            seat.setStatus(SeatStatus.SOLD);
        } else {
            seat.completeSale();
        }

        log.info("주문 완료 성공: orderId={}, seatId={}", order.getId(), seat.getId());

        return new OrderResponse.Detail(
                order.getId(),
                seat.getId(),
                order.getAmount(),
                order.getStatus(),
                order.getCreatedAt(),
                "좌석 예매 및 결제가 성공적으로 완료되었습니다."
        );
    }
}
