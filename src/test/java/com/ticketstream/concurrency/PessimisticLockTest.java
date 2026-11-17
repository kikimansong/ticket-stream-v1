package com.ticketstream.concurrency;

import com.ticketstream.domain.concert.Concert;
import com.ticketstream.domain.concert.ConcertRepository;
import com.ticketstream.domain.order.OrderRequest;
import com.ticketstream.domain.order.OrderService;
import com.ticketstream.global.enums.LockType;
import com.ticketstream.domain.seat.Seat;
import com.ticketstream.domain.seat.SeatRepository;
import com.ticketstream.global.enums.SeatStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDateTime;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
public class PessimisticLockTest {

    @Autowired
    private OrderService orderService;

    @Autowired
    private SeatRepository seatRepository;

    @Autowired
    private ConcertRepository concertRepository;

    private Long targetSeatId;
    private Long targetConcertId;

    @BeforeEach
    void setUp() {
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
    @DisplayName("비관적 락(PESSIMISTIC) 동시성 테스트: 15명 동시 요청 시 정확히 1건만 성공하고 나머지는 실패한다")
    void testPessimisticLockConcurrency() throws InterruptedException {
        int numberOfThreads = 15;
        ExecutorService executorService = Executors.newFixedThreadPool(numberOfThreads);
        CountDownLatch latch = new CountDownLatch(numberOfThreads);

        AtomicInteger successCount = new AtomicInteger();
        AtomicInteger failureCount = new AtomicInteger();

        // When: 15명의 사용자가 동시에 동일 좌석 예매 시도
        for (int i = 1; i <= numberOfThreads; i++) {
            final long userId = i;
            executorService.submit(() -> {
                try {
                    OrderRequest.Create request = OrderRequest.Create.builder()
                            .userId(userId)
                            .concertId(targetConcertId)
                            .seatId(targetSeatId)
                            .lockType(LockType.PESSIMISTIC)
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

        // Then: 성공은 정확히 1건, 나머지는 14건 실패
        System.out.println("=== 비관적 락 테스트 결과 ===");
        System.out.println("성공 수: " + successCount.get());
        System.out.println("실패 수: " + failureCount.get());

        assertThat(successCount.get()).isEqualTo(1);
        assertThat(failureCount.get()).isEqualTo(numberOfThreads - 1);

        Seat updatedSeat = seatRepository.findById(targetSeatId).orElseThrow();
        assertThat(updatedSeat.getStatus()).isEqualTo(SeatStatus.SOLD);
    }
}
