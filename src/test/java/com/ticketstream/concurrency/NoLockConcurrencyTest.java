package com.ticketstream.concurrency;

import com.ticketstream.domain.concert.Concert;
import com.ticketstream.domain.concert.ConcertRepository;
import com.ticketstream.domain.order.Order;
import com.ticketstream.domain.order.OrderRepository;
import com.ticketstream.domain.order.OrderRequest;
import com.ticketstream.domain.order.OrderService;
import com.ticketstream.domain.payment.PaymentRepository;
import com.ticketstream.domain.seat.Seat;
import com.ticketstream.domain.seat.SeatRepository;
import com.ticketstream.global.enums.LockType;
import com.ticketstream.global.enums.SeatStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
public class NoLockConcurrencyTest {

    @Autowired
    private OrderService orderService;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private SeatRepository seatRepository;

    @Autowired
    private ConcertRepository concertRepository;

    private Long targetSeatId;
    private Long targetConcertId;

    @BeforeEach
    void setUp() {
        paymentRepository.deleteAll();
        orderRepository.deleteAll();
        seatRepository.deleteAll();
        concertRepository.deleteAll();

        Concert concert = concertRepository.save(Concert.builder()
                .title("2026 고양 스타디움 라이브")
                .venue("고양종합운동장")
                .concertDate(LocalDateTime.now().plusDays(30))
                .totalSeats(50)
                .build());

        Seat seat = seatRepository.save(Seat.builder()
                .concertId(concert.getId())
                .seatNumber("A-1")
                .status(SeatStatus.AVAILABLE)
                .price(110000L)
                .version(0L)
                .build());

        targetConcertId = concert.getId();
        targetSeatId = seat.getId();
    }

    @Test
    @DisplayName("락 미적용(NONE) 동시성 테스트: 동시 요청 시 1개 좌석에 2건 이상 중복 주문(더블 부킹 결함)이 발생한다")
    void testNoLockDoubleBookingDefect() throws InterruptedException {
        int numberOfThreads = 15;
        ExecutorService executorService = Executors.newFixedThreadPool(numberOfThreads);
        CountDownLatch latch = new CountDownLatch(numberOfThreads);

        AtomicInteger successCount = new AtomicInteger();
        AtomicInteger failureCount = new AtomicInteger();

        // When: 15명의 사용자가 동시에 동일 좌석 예매 시도 (락 없음)
        for (int i = 1; i <= numberOfThreads; i++) {
            final long userId = i;
            executorService.submit(() -> {
                try {
                    OrderRequest.Create request = OrderRequest.Create.builder()
                            .userId(userId)
                            .concertId(targetConcertId)
                            .seatId(targetSeatId)
                            .lockType(LockType.NONE) // 락 미적용
                            .build();

                    orderService.createOrder(request);
                    successCount.incrementAndGet();
                } catch (Exception e) {
                    failureCount.incrementAndGet();
                } finally {
                    latch.countDown();
                }
            });
        }

        latch.await();
        executorService.shutdown();

        List<Order> ordersForSameSeat = orderRepository.findBySeatId(targetSeatId);

        System.out.println("=== 락 미적용(더블 부킹) 테스트 결과 ===");
        System.out.println("예매 성공 수: " + successCount.get());
        System.out.println("동일 좌석에 생성된 실제 주문 수: " + ordersForSameSeat.size());

        // Then: 락이 없으므로 1건을 초과하여 중복 예매(더블 부킹)가 발생함을 입증
        assertThat(successCount.get())
                .as("동시성 제어가 없으므로 2명 이상 성공해야 한다 (더블 부킹 발생)")
                .isGreaterThan(1);

        assertThat(ordersForSameSeat.size())
                .as("DB에 동일 좌석 주문이 2건 이상 저장되어야 한다")
                .isGreaterThan(1);
    }
}
