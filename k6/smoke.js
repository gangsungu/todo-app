import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { generateMarkdown } from './summary.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const TOKEN    = __ENV.K6_TOKEN; // tester11 토큰 단건 사용

const errorRate = new Rate('errors');

export const options = {
  vus: 5,
  duration: '30s',
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    errors: ['rate<0.01'],
  },
};

function authCookie(token) {
  return { cookies: { access_token: token } };
}

export default function () {
  const res = http.get(`${BASE_URL}/api/todos`, authCookie(TOKEN));
  const ok = check(res, {
    'GET /api/todos → 200': (r) => r.status === 200,
    'response is array':    (r) => Array.isArray(JSON.parse(r.body)),
  });
  errorRate.add(!ok);

  sleep(1);
}

export function handleSummary(data) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return {
    [`/home/ubuntu/k6-results/smoke_${ts}.md`]: generateMarkdown('Smoke', data),
    stdout: '\n',
  };
}
