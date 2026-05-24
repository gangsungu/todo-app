/**
 * Cascade Stress 시나리오
 *
 * 목적: 부모 COMPLETED 처리 시 발생하는 findAllForTreeByUserId 이중 호출이
 *       동시 쓰기 환경에서 어떻게 버티는지 수치로 확인.
 *
 * 유저별로 별도 cascade 트리를 생성해 DB 행 락 경합 없이
 * 쿼리 오버헤드만 측정합니다.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

// tokens.json: ./gradlew generateTestTokens --args="<secret> 11 99 24" > k6/tokens.json
const tokens = new SharedArray('tokens', () => JSON.parse(open('./tokens.json')));

const errorRate   = new Rate('errors');
const cascadeTime = new Trend('cascade_duration', true);

export const options = {
  stages: [
    { duration: '30s', target: 100 },
    { duration: '1m',  target: 100 },
    { duration: '30s', target: 0   },
  ],
};

const HEADERS = { 'Content-Type': 'application/json' };

function authCookie(token) {
  return { cookies: { access_token: token }, headers: HEADERS };
}

export function setup() {
  // 유저별로 cascade-root + 자식 10개 생성
  // tokens 전체 대신 앞 10개만 사용 (setup 속도 및 DB 부하 고려)
  const count = Math.min(tokens.length, 10);
  const rootIds = [];

  for (let i = 0; i < count; i++) {
    const token = tokens[i];

    const rootRes = http.post(`${BASE_URL}/api/todos`, JSON.stringify({
      title: `cascade-root-${i}`,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      progress: 0,
    }), authCookie(token));

    check(rootRes, { [`setup[${i}]: root created`]: (r) => r.status === 200 });
    const rootId = JSON.parse(rootRes.body).id;
    rootIds.push(rootId);

    for (let j = 0; j < 10; j++) {
      http.post(`${BASE_URL}/api/todos`, JSON.stringify({
        title: `child-${j}`,
        parentId: rootId,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        progress: 0,
      }), authCookie(token));
    }
  }

  return { rootIds };
}

export default function ({ rootIds }) {
  const idx   = (__VU - 1) % rootIds.length;
  const token  = tokens[idx];
  const rootId = rootIds[idx];

  const status = Math.random() < 0.5 ? 'COMPLETED' : 'TODO';
  const body = JSON.stringify({
    title: `cascade-root-${idx}`,
    status,
    progress: status === 'COMPLETED' ? 100 : 0,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
  });

  const res = http.patch(`${BASE_URL}/api/todos/${rootId}`, body, authCookie(token));
  errorRate.add(!check(res, { 'PATCH cascade → 200': (r) => r.status === 200 }));
  cascadeTime.add(res.timings.duration);

  sleep(0.2);
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
