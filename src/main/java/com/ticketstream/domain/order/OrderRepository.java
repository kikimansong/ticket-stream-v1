package com.ticketstream.domain.order;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    List<Order> findByConcertId(Long concertId);

    List<Order> findBySeatId(Long seatId);

    @Modifying(clearAutomatically = true)
    @Query(value = "DELETE FROM orders WHERE concert_id = :concertId", nativeQuery = true)
    int deleteByConcertId(@Param("concertId") Long concertId);
}
