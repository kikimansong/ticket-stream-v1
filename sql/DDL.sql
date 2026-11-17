-- ========================================================
-- Ticket Stream v1 - DDL (PostgreSQL)
-- 단일 모놀리식 & 동기식 DB 락 테스트용 스키마 정의
-- ========================================================

-- 1. 기존 테이블 정리 (외래키 및 종속성 고려 역순 삭제)
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS seats CASCADE;
DROP TABLE IF EXISTS concerts CASCADE;


-- 2. concerts (공연 마스터 테이블)
CREATE TABLE concerts (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    venue VARCHAR(100) NOT NULL,
    concert_date TIMESTAMP NOT NULL,
    total_seats INT DEFAULT 500 NOT NULL
);

COMMENT ON TABLE concerts IS '공연 정보 테이블';
COMMENT ON COLUMN concerts.id IS '공연 고유 식별자 (PK)';
COMMENT ON COLUMN concerts.title IS '공연 제목';
COMMENT ON COLUMN concerts.venue IS '공연 장소 (예: 고양종합운동장)';
COMMENT ON COLUMN concerts.concert_date IS '공연 일시';
COMMENT ON COLUMN concerts.total_seats IS '총 좌석 수';


-- 3. seats (좌석 테이블 - 핵심 동시성 락 대상)
CREATE TABLE seats (
    id BIGSERIAL PRIMARY KEY,
    concert_id BIGINT NOT NULL,
    seat_number VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'AVAILABLE' NOT NULL,
    price BIGINT DEFAULT 110000 NOT NULL,
    version BIGINT DEFAULT 0 NOT NULL,
    CONSTRAINT fk_seats_concert FOREIGN KEY (concert_id) REFERENCES concerts(id) ON DELETE CASCADE
);

COMMENT ON TABLE seats IS '좌석 정보 및 동시성 락 제어 테이블';
COMMENT ON COLUMN seats.id IS '좌석 고유 식별자 (PK, 비관적 락 SELECT FOR UPDATE 타겟)';
COMMENT ON COLUMN seats.concert_id IS '해당 공연 ID';
COMMENT ON COLUMN seats.seat_number IS '좌석 번호 (예: A-1, J-50)';
COMMENT ON COLUMN seats.status IS '좌석 상태 (AVAILABLE: 선점가능, RESERVED: 선점중, SOLD: 판매완료)';
COMMENT ON COLUMN seats.price IS '좌석 티켓 가격';
COMMENT ON COLUMN seats.version IS '낙관적 락 버전 번호 (@Version 충돌 검출용)';

-- 동시성 조회 및 좌석 맵 성능 인덱스
CREATE INDEX idx_seats_concert_status ON seats(concert_id, status);
CREATE INDEX idx_seats_concert_number ON seats(concert_id, seat_number);


-- 4. orders (주문 테이블)
CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    concert_id BIGINT NOT NULL,
    seat_id BIGINT NOT NULL,
    amount BIGINT NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

COMMENT ON TABLE orders IS '예매 주문 테이블';
COMMENT ON COLUMN orders.id IS '주문 고유 식별자 (PK)';
COMMENT ON COLUMN orders.user_id IS '예매자 사용자 ID';
COMMENT ON COLUMN orders.concert_id IS '예매한 공연 ID';
COMMENT ON COLUMN orders.seat_id IS '선점한 좌석 ID';
COMMENT ON COLUMN orders.amount IS '결제 주문 금액';
COMMENT ON COLUMN orders.status IS '주문 상태 (PENDING, COMPLETED, CANCELLED)';
COMMENT ON COLUMN orders.created_at IS '주문 일시';

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_seat ON orders(seat_id);


-- 5. payments (결제 테이블)
CREATE TABLE payments (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL,
    amount BIGINT NOT NULL,
    status VARCHAR(20) DEFAULT 'SUCCESS' NOT NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

COMMENT ON TABLE payments IS 'PG 결제 승인 이력 테이블';
COMMENT ON COLUMN payments.id IS '결제 고유 식별자 (PK)';
COMMENT ON COLUMN payments.order_id IS '연계된 주문 ID';
COMMENT ON COLUMN payments.amount IS '결제 승인 금액';
COMMENT ON COLUMN payments.status IS '결제 상태 (SUCCESS, FAILED)';
COMMENT ON COLUMN payments.payment_date IS '결제 승인 일시';

CREATE INDEX idx_payments_order ON payments(order_id);
