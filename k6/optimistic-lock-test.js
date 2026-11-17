import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

// 메트릭 정의
const successCount = new Counter('orders_success');
const conflictCount = new Counter('orders_conflict_409');
const otherErrorCount = new Counter('orders_error_other');

// 1. 시나리오: 낙관적 락(@Version) 동시성 검증 (15명 동시 요청)
const VUS = 15;

export const options = {
  scenarios: {
    optimistic_contention: {
      executor: 'per-vu-iterations',
      vus: VUS,
      iterations: 1,
      maxDuration: '10s',
    },
  },
  thresholds: {
    // 선행 트랜잭션 단 1명만 성공해야 함
    'orders_success': ['count==1'],
    // 나머지 14명은 커밋 시점 @Version 충돌로 409 Conflict 발생해야 함
    'orders_conflict_409': [`count==${VUS - 1}`],
    // 알 수 없는 500 에러는 0건이어야 함
    'orders_error_other': ['count==0'],
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
  console.log(`[k6 Setup] 좌석 초기화 완료! 낙관적 락 테스트 시작 (${VUS}명 동시 경합)`);
  console.log(`======================================================\n`);
}

export default function () {
  const userId = 4000 + __VU;

  const payload = JSON.stringify({
    userId: userId,
    concertId: CONCERT_ID,
    seatId: TARGET_SEAT_ID,
    lockType: 'OPTIMISTIC', // 낙관적 락 (@Version 충돌 검출)
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const res = http.post(`${BASE_URL}/orders`, payload, params);

  if (res.status === 200) {
    successCount.add(1);
    console.log(`🎉 [SUCCESS] VU ${__VU} (User ${userId}) 예매 성공! (version 0 -> 1 갱신)`);
  } else if (res.status === 409) {
    conflictCount.add(1);
    // 낙관적 락 버전 충돌로 정상 롤백된 요청
  } else {
    otherErrorCount.add(1);
    console.error(`🚨 [ERROR] VU ${__VU} 예외 발생 HTTP ${res.status}: ${res.body}`);
  }

  check(res, {
    'status is 200 (Winner) or 409 (Optimistic Conflict)': (r) => r.status === 200 || r.status === 409,
  });
}

export function teardown() {
  console.log(`\n======================================================`);
  console.log(`[k6 Teardown] 낙관적 락 최종 DB 정합성 검증...`);
  const seatRes = http.get(`${BASE_URL}/seats/${TARGET_SEAT_ID}`);
  if (seatRes.status === 200) {
    const seatData = seatRes.json().data;
    console.log(`[k6 Teardown] 대상 좌석(${TARGET_SEAT_ID}) 상태: ${seatData.status}, version: ${seatData.version}`);
    check(seatRes, {
      'seat status is SOLD': () => seatData.status === 'SOLD',
      'seat version incremented to 1': () => seatData.version === 1,
    });
  }
  console.log(`======================================================\n`);
}
