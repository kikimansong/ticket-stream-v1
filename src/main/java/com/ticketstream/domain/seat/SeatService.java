package com.ticketstream.domain.seat;

import com.ticketstream.domain.order.OrderRepository;
import com.ticketstream.domain.payment.PaymentRepository;
import com.ticketstream.global.enums.LockType;
import com.ticketstream.global.enums.SeatStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class SeatService {

    private final SeatRepository seatRepository;
    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;

    @Transactional(readOnly = true)
    public List<SeatResponse.List> getSeatsByConcert(Long concertId) {
        return seatRepository.findByConcertIdOrderByIdAsc(concertId).stream()
                .map(s -> new SeatResponse.List(
                        s.getId(),
                        s.getConcertId(),
                        s.getSeatNumber(),
                        s.getStatus(),
                        s.getPrice(),
                        s.getVersion()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public SeatResponse.Detail getSeatDetail(Long seatId) {
        Seat s = seatRepository.findById(seatId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 좌석입니다: " + seatId));
        return new SeatResponse.Detail(
                s.getId(),
                s.getConcertId(),
                s.getSeatNumber(),
                s.getStatus(),
                s.getPrice(),
                s.getVersion()
        );
    }

    @Transactional
    public Seat reserveSeat(Long seatId, LockType lockType) {
        log.info("좌석 선점 시도: seatId={}, lockType={}", seatId, lockType);
        Seat seat;

        switch (lockType) {
            case PESSIMISTIC -> seat = seatRepository.findByIdWithPessimisticLock(seatId)
                    .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 좌석입니다: " + seatId));
            case OPTIMISTIC -> seat = seatRepository.findByIdWithOptimisticLock(seatId)
                    .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 좌석입니다: " + seatId));
            case NONE -> seat = seatRepository.findById(seatId)
                    .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 좌석입니다: " + seatId));
            default -> throw new IllegalArgumentException("지원하지 않는 락 타입입니다: " + lockType);
        }

        if (seat.getStatus() != SeatStatus.AVAILABLE) {
            throw new IllegalStateException("이미 선점되었거나 판매 완료된 좌석입니다: " + seat.getSeatNumber());
        }

        if (lockType == LockType.NONE) {
            // 락 미적용 시: 동시 요청이 동시에 AVAILABLE을 읽고 진행하도록 유도하여 더블 부킹을 재현
            try {
                Thread.sleep(15);
            } catch (InterruptedException ignored) {}

            seatRepository.updateStatusWithoutLock(seatId, SeatStatus.RESERVED.name());
            seat.setStatus(SeatStatus.RESERVED);
        } else {
            seat.reserve();
        }

        return seat;
    }

    @Transactional
    public void resetSeats(Long concertId) {
        log.info("공연 좌석 및 주문/결제 전체 초기화 시작: concertId={}", concertId);

        orderRepository.deleteByConcertId(concertId);
        paymentRepository.deleteAllPayments();
        seatRepository.resetSeatsByConcertId(concertId);

        log.info("공연 좌석 및 주문/결제 전체 초기화 완료: concertId={}", concertId);
    }
}
