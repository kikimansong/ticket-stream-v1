package com.ticketstream.domain.order;

import com.ticketstream.global.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @PostMapping
    public ApiResponse<OrderResponse.Detail> createOrder(@RequestBody OrderRequest.Create request) {
        OrderResponse.Detail response = orderService.createOrder(request);
        return ApiResponse.ok("주문이 완료되었습니다.", response);
    }
}
