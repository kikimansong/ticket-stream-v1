import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

// 메트릭 정의
const successCount = new Counter('orders_success');
const blockedCount = new Counter('orders_blocked_400');
const otherErrorCount = new Counter('orders_error_other');

// 1. 시나리오 1: 소규모 동시성 정합성 검증 (15명 동시 요청)
const VUS = 15;

export const options = {
  scenarios: {
    single_seat_contention: {
      executor: 'per-vu-iterations',
      vus: VUS,
      iterations: 1,
      maxDuration: '10s',
    },
  },
  thresholds: {
    // 1등 단 1명만 성공해야 함 (더블 부킹 방지)
    'orders_success': ['count==1'],
    // 나머지 14명은 전원 400(이미 판매된 좌석)으로 안전하게 차단되어야 함
    'orders_blocked_400': [`count==${VUS - 1}`],
    // 서버 500 에러는 0건이어야 함
    'orders_error_other': ['count==0'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:8080/api/v1';
const CONCERT_ID = 1;
const TARGET_SEAT_ID = 1;

// 2. 테스트 시작 전: 대상 콘서트 좌석 및 이전 주문/결제 내역 초기화
export function setup() {
  console.log(`\n======================================================`);
  console.log(`[k6 Setup] 공연 ID ${CONCERT_ID} 좌석 초기화...`);
  const resetRes = http.post(`${BASE_URL}/seats/reset/${CONCERT_ID}`);
  check(resetRes, {
    'setup: seats reset successfully': (r) => r.status === 200,
  });
  console.log(`[k6 Setup] 좌석 초기화 완료! 동시성 정합성 테스트 시작 (${VUS}명 동시 경합)`);
  console.log(`======================================================\n`);
}

// 3. 메인 부하: 15명이 동시에 좌석 1개 예매 시도 (PESSIMISTIC)
export default function () {
  const userId = 3000 + __VU;

  const payload = JSON.stringify({
    userId: userId,
    concertId: CONCERT_ID,
    seatId: TARGET_SEAT_ID,
    lockType: 'PESSIMISTIC',
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const res = http.post(`${BASE_URL}/orders`, payload, params);

  if (res.status === 200) {
    successCount.add(1);
    console.log(`🎉 [SUCCESS] VU ${__VU} (User ${userId}) 예매 성공!`);
  } else if (res.status === 400) {
    blockedCount.add(1);
  } else {
    otherErrorCount.add(1);
    console.error(`🚨 [ERROR] VU ${__VU} 예외 발생 HTTP ${res.status}: ${res.body}`);
  }

  check(res, {
    'status is 200 (Winner) or 400 (Blocked)': (r) => r.status === 200 || r.status === 400,
  });
}

// 4. 테스트 종료 후 최종 검증: 대상 좌석이 정상적으로 SOLD 상태인지 확인
export function teardown() {
  console.log(`\n======================================================`);
  console.log(`[k6 Teardown] 최종 DB 정합성 검증...`);
  const seatRes = http.get(`${BASE_URL}/seats/${TARGET_SEAT_ID}`);
  if (seatRes.status === 200) {
    const seatData = seatRes.json().data;
    console.log(`[k6 Teardown] 대상 좌석(${TARGET_SEAT_ID}) 최종 상태: ${seatData.status}`);
    check(seatRes, {
      'seat status is SOLD': () => seatData.status === 'SOLD',
    });
  }
  console.log(`======================================================\n`);
}
