import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const TOKEN    = __ENV.K6_TOKEN;

const errorRate  = new Rate('errors');
const createTime = new Trend('create_duration');
const updateTime = new Trend('update_duration');

export const options = {
  stages: [
    { duration: '1m', target: 50 },  // ramp-up
    { duration: '3m', target: 50 },  // steady
    { duration: '1m', target: 0  },  // ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    errors: ['rate<0.01'],
  },
};

const HEADERS = { 'Content-Type': 'application/json' };

function authCookie() {
  return { cookies: { access_token: TOKEN }, headers: HEADERS };
}

function weightedAction() {
  const r = Math.random();
  if (r < 0.70) return 'read';
  if (r < 0.90) return 'create';
  return 'update';
}

// setup()에서 생성한 id 목록을 VU 간 공유
export function setup() {
  // 업데이트에 쓸 기준 todo 하나 생성
  const body = JSON.stringify({
    title: 'load-base',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    progress: 0,
  });
  const res = http.post(`${BASE_URL}/api/todos`, body, authCookie());
  check(res, { 'setup: todo created': (r) => r.status === 200 });
  return { baseTodoId: JSON.parse(res.body).id };
}

export default function ({ baseTodoId }) {
  const action = weightedAction();

  if (action === 'read') {
    const res = http.get(`${BASE_URL}/api/todos`, authCookie());
    const ok = check(res, { 'GET 200': (r) => r.status === 200 });
    errorRate.add(!ok);

  } else if (action === 'create') {
    const body = JSON.stringify({
      title: `task-${Date.now()}`,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      progress: 0,
    });
    const res = http.post(`${BASE_URL}/api/todos`, body, authCookie());
    const ok = check(res, { 'POST 200': (r) => r.status === 200 });
    errorRate.add(!ok);
    createTime.add(res.timings.duration);

  } else {
    const body = JSON.stringify({
      title: 'updated-task',
      status: 'IN_PROGRESS',
      progress: 50,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    });
    const res = http.patch(`${BASE_URL}/api/todos/${baseTodoId}`, body, authCookie());
    const ok = check(res, { 'PATCH 200': (r) => r.status === 200 });
    errorRate.add(!ok);
    updateTime.add(res.timings.duration);
  }

  sleep(Math.random() * 2 + 0.5); // 0.5~2.5s 사이 랜덤 think time
}
