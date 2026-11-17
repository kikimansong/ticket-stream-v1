import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

// 메트릭 정의
const successCount = new Counter('orders_success');
const blockedCount = new Counter('orders_blocked_400');

// 1. 시나리오 3: 락 미적용(NONE) 시 더블 부킹 결함 재현 (15명 동시 요청)
const VUS = 15;

export const options = {
  scenarios: {
    no_lock_contention: {
      executor: 'per-vu-iterations',
      vus: VUS,
      iterations: 1,
      maxDuration: '10s',
    },
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:8080/api/v1';
const CONCERT_ID = 1;
const TARGET_SEAT_ID = 1;

export function setup() {
  console.log(`\n======================================================`);
  console.log(`[k6 Setup] 공연 ID ${CONCERT_ID} 좌석 초기화...`);
  const resetRes = http.post(`${BASE_URL}/seats/reset/${CONCERT_ID}`);
  check(resetRes, {
    'setup: seats reset successfully': (r) => r.status === 200,
  });
  console.log(`[k6 Setup] 좌석 초기화 완료! 락 미적용(NONE) 테스트 시작 (${VUS}명 동시 경합)`);
  console.log(`======================================================\n`);
}

export default function () {
  const userId = 7000 + __VU;

  const payload = JSON.stringify({
    userId: userId,
    concertId: CONCERT_ID,
    seatId: TARGET_SEAT_ID,
    lockType: 'NONE', // 락 미적용!
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const res = http.post(`${BASE_URL}/orders`, payload, params);

  if (res.status === 200) {
    successCount.add(1);
    console.log(`⚠️ [200 OK] VU ${__VU} (User ${userId}) 예매 성공! (더블 부킹 가능성)`);
  } else if (res.status === 400) {
    blockedCount.add(1);
  }
}

export function teardown() {
  console.log(`\n======================================================`);
  console.log(`[k6 Teardown] 락 미적용 테스트 종료.`);
  console.log(`💡 성공 건수가 2건 이상이면 1개 좌석에 중복 결제(더블 부킹)가 발생한 것입니다.`);
  console.log(`======================================================\n`);
}
