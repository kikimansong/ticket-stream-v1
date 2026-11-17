import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

// 메트릭 정의
const successCount = new Counter('orders_success');
const blockedCount = new Counter('orders_blocked_400');
const timeoutErrorCount = new Counter('orders_timeout_500');

// 1. 시나리오 2: 트래픽 폭주 및 타임아웃 한계 체감 (120명 동시 요청)
const VUS = 120;

export const options = {
  scenarios: {
    overload_contention: {
      executor: 'per-vu-iterations',
      vus: VUS,
      iterations: 1,
      maxDuration: '15s',
    },
  },
  thresholds: {
    // 아무리 부하가 터져도 성공은 오직 1건이어야 함 (더블 부킹 0건)
    'orders_success': ['count==1'],
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
  console.log(`[k6 Setup] 좌석 초기화 완료! 과부하 폭주 테스트 시작 (${VUS}명 동시 경합)`);
  console.log(`🔥 팁: 지금 브라우저에서 메인화면을 새로고침해보세요. 커넥션 풀 고갈을 체감할 수 있습니다!`);
  console.log(`======================================================\n`);
}

export default function () {
  const userId = 5000 + __VU;

  const payload = JSON.stringify({
    userId: userId,
    concertId: CONCERT_ID,
    seatId: TARGET_SEAT_ID,
    lockType: 'PESSIMISTIC',
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
    timeout: '10s',
  };

  const res = http.post(`${BASE_URL}/orders`, payload, params);

  if (res.status === 200) {
    successCount.add(1);
    console.log(`🎉 [SUCCESS] VU ${__VU} (User ${userId}) 예매 성공!`);
  } else if (res.status === 400) {
    blockedCount.add(1);
  } else if (res.status === 500) {
    timeoutErrorCount.add(1);
    // 3초 타임아웃 초과로 폭발한 요청
  }

  check(res, {
    'status is valid': (r) => r.status === 200 || r.status === 400 || r.status === 500,
  });
}

export function teardown() {
  console.log(`\n======================================================`);
  console.log(`[k6 Teardown] 과부하 테스트 종료.`);
  console.log(`• 1등 성공: 1건`);
  console.log(`• 정상 차단(400): 앞 순번`);
  console.log(`• 3초 타임아웃(500): 뒤 순번 (커넥션 풀 고갈 확인)`);
  console.log(`======================================================\n`);
}
