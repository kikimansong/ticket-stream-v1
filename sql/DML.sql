-- ========================================================
-- Ticket Stream v1 - DML (PostgreSQL)
-- 테스트용 기초 데이터 (3개 공연 + 공연당 500석 좌석 자동 생성)
-- ========================================================

-- 기존 데이터 초기화 및 ID 시퀀스 리셋
TRUNCATE TABLE payments, orders, seats, concerts RESTART IDENTITY CASCADE;


-- ========================================================
-- 1. concerts 등록 (테스트용 주요 스타디움 공연 3건)
-- ========================================================
INSERT INTO concerts (id, title, venue, concert_date, total_seats) VALUES
(1, '2026 고양 스타디움 라이브 메가 콘서트', '고양종합운동장 주경기장', CURRENT_TIMESTAMP + INTERVAL '30 days', 500),
(2, '2026 서울 월드투어 피날레', '잠실 올림픽 주경기장', CURRENT_TIMESTAMP + INTERVAL '45 days', 500),
(3, '2026 부산 락 페스티벌', '부산 아시아드 주경기장', CURRENT_TIMESTAMP + INTERVAL '60 days', 500);

-- 시퀀스를 다음 번호(4)로 동기화
SELECT setval('concerts_id_seq', (SELECT MAX(id) FROM concerts));


-- ========================================================
-- 2. seats 대량 등록 (각 공연당 500석 = 총 1,500석)
--    열: A, B, C, D, E, F, G, H, I, J (10개 열)
--    행: 열당 1~50번 (50석)
-- ========================================================
DO $$
DECLARE
    cid BIGINT;
    row_name TEXT;
    row_list TEXT[] := ARRAY['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
BEGIN
    -- 등록된 3개 콘서트에 대해 순회
    FOR cid IN 1..3 LOOP
        FOREACH row_name IN ARRAY row_list LOOP
            INSERT INTO seats (concert_id, seat_number, status, price, version)
            SELECT 
                cid,
                row_name || '-' || s,
                'AVAILABLE',
                110000,
                0
            FROM generate_series(1, 50) AS s;
        END LOOP;
    END LOOP;
END $$;


-- ========================================================
-- 3. [참고] 테스트 중 좌석 상태를 다시 초기화하고 싶을 때 실행하는 쿼리
-- ========================================================
-- UPDATE seats SET status = 'AVAILABLE', version = 0 WHERE concert_id = 1;
-- DELETE FROM orders WHERE concert_id = 1;
-- DELETE FROM payments WHERE id IN (SELECT id FROM payments);
