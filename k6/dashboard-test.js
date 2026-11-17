import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

// 메트릭 정의
const successCount = new Counter('orders_success');
const blockedCount = new Counter('orders_blocked_400');

// 웹 대시보드 실시간 모니터링을 위해 20초간 지속 실행
export const options = {
  stages: [
    { duration: '5s', target: 10 },   // 5초 동안 10명까지 증가
    { duration: '10s', target: 20 },  // 10초 동안 20명 유지 (대시보드 실시간 관찰)
    { duration: '5s', target: 0 },    // 5초 동안 서서히 감소
  ],
  thresholds: {
    'orders_success': ['count>=1'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:8080/api/v1';

export function setup() {
  console.log(`[k6 Setup] 공연 좌석 초기화...`);
  http.post(`${BASE_URL}/seats/reset/1`);
  console.log(`[k6 Setup] 좌석 초기화 완료! 대시보드 모니터링 시작 (http://127.0.0.1:5665)`);
}

export default function () {
  const userId = 8000 + __VU;

  const payload = JSON.stringify({
    userId: userId,
    concertId: 1,
    seatId: 1,
    lockType: 'PESSIMISTIC',
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const res = http.post(`${BASE_URL}/orders`, payload, params);

  if (res.status === 200) {
    successCount.add(1);
  } else if (res.status === 400) {
    blockedCount.add(1);
  }

  // 요청 간 0.5초 간격을 두어 지속적으로 그래프가 그려지도록 함
  sleep(0.5);
}
