/**
 * Cascade Stress 시나리오
 *
 * 목적: Recursive CTE 최적화 before/after 성능 비교.
 *       유저별 할일 규모를 현실적으로 분포시켜 쿼리 오버헤드를 측정.
 *
 * 유저 분포 (tester11~99, 89명):
 *   - light  (i <  30): 배경 할일 100개  → cascade 시 111행 스캔 (before)
 *   - medium (i <  60): 배경 할일 500개  → cascade 시 511행 스캔 (before)
 *   - heavy  (i >= 60): 배경 할일 1000개 → cascade 시 1011행 스캔 (before)
 *
 * after(CTE): 유저 규모와 무관하게 항상 자식 10개 ID만 조회.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import { generateMarkdown } from './summary.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

// tokens.json: ./gradlew generateTestTokens --args="<secret> 11 99 24" > k6/tokens.json
const tokens = new SharedArray('tokens', () => JSON.parse(open('./tokens.json')));

const errorRate   = new Rate('errors');
const cascadeTime = new Trend('cascade_duration', true);

export const options = {
  setupTimeout: '10m',
  stages: [
    { duration: '30s', target: 200 },
    { duration: '1m',  target: 200 },
    { duration: '30s', target: 0   },
  ],
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

const HEADERS = { 'Content-Type': 'application/json' };

function authCookie(token) {
  return { cookies: { access_token: token }, headers: HEADERS };
}

function bgCount(i) {
  if (i < 30) return 100;
  if (i < 60) return 500;
  return 1000;
}

export function setup() {
  const rootIds = [];

  for (let i = 0; i < tokens.length; i++) {
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

    const childReqs = Array.from({ length: 10 }, (_, j) => [
      'POST',
      `${BASE_URL}/api/todos`,
      JSON.stringify({ title: `child-${j}`, parentId: rootId, startDate: '2026-01-01', endDate: '2026-12-31', progress: 0 }),
      authCookie(token),
    ]);
    http.batch(childReqs);

    const bg = bgCount(i);
    const bgReqs = Array.from({ length: bg }, (_, k) => [
      'POST',
      `${BASE_URL}/api/todos`,
      JSON.stringify({ title: `bg-${k}`, startDate: '2026-01-01', endDate: '2026-12-31', progress: 0 }),
      authCookie(token),
    ]);
    http.batch(bgReqs);
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
  const ts    = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const label = __ENV.TEST_LABEL ? `_${__ENV.TEST_LABEL}` : '';
  return {
    [`/home/ubuntu/k6-results/stress${label}_${ts}.md`]: generateMarkdown('Cascade Stress', data),
    stdout: '\n',
  };
}
