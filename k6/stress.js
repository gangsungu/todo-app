/**
 * Cascade Stress 시나리오
 *
 * 목적: 부모 COMPLETED 처리 시 발생하는 findAllForTreeByUserId 이중 호출이
 *       동시 쓰기 환경에서 어떻게 버티는지 수치로 확인.
 *
 * 사전 조건: k6/seed.sql 실행 후 'cascade-root' 부모와 자식 10개가 DB에 있어야 합니다.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const TOKEN    = __ENV.K6_TOKEN;

const errorRate   = new Rate('errors');
const cascadeTime = new Trend('cascade_duration', true);

export const options = {
  stages: [
    { duration: '30s', target: 100 }, // ramp-up
    { duration: '1m',  target: 100 }, // steady — cascade 집중 구간
    { duration: '30s', target: 0   }, // ramp-down
  ],
  // 임계값 없음 — 통과 여부가 아닌 p50/p95/p99 수치 측정이 목적
};

const HEADERS = { 'Content-Type': 'application/json' };

function authCookie() {
  return { cookies: { access_token: TOKEN }, headers: HEADERS };
}

export function setup() {
  // seed.sql로 만든 cascade-root id 조회
  const res = http.get(`${BASE_URL}/api/todos`, authCookie());
  check(res, { 'setup: todos loaded': (r) => r.status === 200 });

  const todos = JSON.parse(res.body);
  const root = todos.find((t) => t.title === 'cascade-root');
  if (!root) {
    throw new Error('cascade-root를 찾을 수 없습니다. k6/seed.sql을 먼저 실행하세요.');
  }
  return { rootId: root.id };
}

export default function ({ rootId }) {
  // COMPLETED → TODO → COMPLETED 반복으로 cascade 지속 발생
  const statuses = ['COMPLETED', 'TODO'];
  const status = statuses[Math.floor(Math.random() * statuses.length)];

  const body = JSON.stringify({
    title: 'cascade-root',
    status,
    progress: status === 'COMPLETED' ? 100 : 0,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
  });

  const res = http.patch(`${BASE_URL}/api/todos/${rootId}`, body, authCookie());
  const ok = check(res, {
    'PATCH cascade → 200': (r) => r.status === 200,
  });

  errorRate.add(!ok);
  cascadeTime.add(res.timings.duration);

  sleep(0.2); // think time 최소화 — 최대한 부하 집중
}

export function handleSummary(data) {
  const d = data.metrics.cascade_duration;
  if (!d) return {};

  console.log('\n=== Cascade Stress 결과 ===');
  console.log(`p50  : ${d.values['p(50)'].toFixed(0)}ms`);
  console.log(`p95  : ${d.values['p(95)'].toFixed(0)}ms`);
  console.log(`p99  : ${d.values['p(99)'].toFixed(0)}ms`);
  console.log(`max  : ${d.values.max.toFixed(0)}ms`);
  console.log(`에러율: ${(data.metrics.errors.values.rate * 100).toFixed(2)}%`);
  console.log('===========================\n');

  return {};
}
