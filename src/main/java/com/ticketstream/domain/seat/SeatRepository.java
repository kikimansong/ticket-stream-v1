package com.ticketstream.domain.seat;

import jakarta.persistence.LockModeType;
import jakarta.persistence.QueryHint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SeatRepository extends JpaRepository<Seat, Long> {

    List<Seat> findByConcertIdOrderByIdAsc(Long concertId);

    // 1. 비관적 락 (SELECT FOR UPDATE - 행 배타 잠금, 3초 타임아웃)
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints({@QueryHint(name = "jakarta.persistence.lock.timeout", value = "3000")})
    @Query("SELECT s FROM Seat s WHERE s.id = :id")
    Optional<Seat> findByIdWithPessimisticLock(@Param("id") Long id);

    // 2. 낙관적 락 (@Version 충돌 검출)
    @Lock(LockModeType.OPTIMISTIC)
    @Query("SELECT s FROM Seat s WHERE s.id = :id")
    Optional<Seat> findByIdWithOptimisticLock(@Param("id") Long id);

    // 3. 락 미적용 시뮬레이션용 (JPA @Version 우회 Native 업데이트 - 더블 부킹 재현용)
    @Modifying(clearAutomatically = true)
    @Query(value = "UPDATE seats SET status = :status WHERE id = :id", nativeQuery = true)
    int updateStatusWithoutLock(@Param("id") Long id, @Param("status") String status);

    // 4. 특정 공연 전체 좌석 초기화 (AVAILABLE, version=0)
    @Modifying(clearAutomatically = true)
    @Query(value = "UPDATE seats SET status = 'AVAILABLE', version = 0 WHERE concert_id = :concertId", nativeQuery = true)
    int resetSeatsByConcertId(@Param("concertId") Long concertId);
}
