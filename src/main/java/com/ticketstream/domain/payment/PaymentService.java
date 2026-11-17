package com.ticketstream.domain.payment;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final PaymentRepository paymentRepository;

    @Transactional
    public PaymentResponse.Detail processPayment(Long orderId, Long amount) {
        log.info("PG 결제 승인 요청: orderId={}, amount={}", orderId, amount);

        Payment payment = Payment.builder()
                .orderId(orderId)
                .amount(amount)
                .status("SUCCESS")
                .paymentDate(LocalDateTime.now())
                .build();

        Payment saved = paymentRepository.save(payment);
        return new PaymentResponse.Detail(
                saved.getId(),
                saved.getOrderId(),
                saved.getAmount(),
                saved.getStatus(),
                saved.getPaymentDate()
        );
    }
}
