import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

// tokens.json: ./gradlew generateTestTokens --args="<secret> 11 99 24" > k6/tokens.json
const tokens = new SharedArray('tokens', () => JSON.parse(open('./tokens.json')));

const errorRate  = new Rate('errors');
const createTime = new Trend('create_duration');
const updateTime = new Trend('update_duration');

export const options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '3m', target: 50 },
    { duration: '1m', target: 0  },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    errors: ['rate<0.01'],
  },
};

const HEADERS = { 'Content-Type': 'application/json' };

function authCookie(token) {
  return { cookies: { access_token: token }, headers: HEADERS };
}

function myToken() {
  return tokens[(__VU - 1) % tokens.length];
}

function weightedAction() {
  const r = Math.random();
  if (r < 0.70) return 'read';
  if (r < 0.90) return 'create';
  return 'update';
}

export function setup() {
  // 유저별로 각자의 base todo 생성 (소유권 검증 통과를 위해)
  const baseTodoIds = [];
  const body = JSON.stringify({
    title: 'load-base',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    progress: 0,
  });
  for (let i = 0; i < tokens.length; i++) {
    const res = http.post(`${BASE_URL}/api/todos`, body, authCookie(tokens[i]));
    check(res, { [`setup[${i}]: base todo created`]: (r) => r.status === 200 });
    baseTodoIds.push(JSON.parse(res.body).id);
  }
  return { baseTodoIds };
}

export default function ({ baseTodoIds }) {
  const idx    = (__VU - 1) % tokens.length;
  const token  = tokens[idx];
  const action = weightedAction();

  if (action === 'read') {
    const res = http.get(`${BASE_URL}/api/todos`, authCookie(token));
    errorRate.add(!check(res, { 'GET 200': (r) => r.status === 200 }));

  } else if (action === 'create') {
    const body = JSON.stringify({
      title: `task-${Date.now()}`,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      progress: 0,
    });
    const res = http.post(`${BASE_URL}/api/todos`, body, authCookie(token));
    errorRate.add(!check(res, { 'POST 200': (r) => r.status === 200 }));
    createTime.add(res.timings.duration);

  } else {
    const body = JSON.stringify({
      title: 'updated-task',
      status: 'IN_PROGRESS',
      progress: 50,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    });
    const res = http.patch(`${BASE_URL}/api/todos/${baseTodoIds[idx]}`, body, authCookie(token));
    errorRate.add(!check(res, { 'PATCH 200': (r) => r.status === 200 }));
    updateTime.add(res.timings.duration);
  }

  sleep(Math.random() * 2 + 0.5);
}
