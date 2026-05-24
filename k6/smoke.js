import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const TOKEN    = __ENV.K6_TOKEN;

const errorRate = new Rate('errors');

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    errors: ['rate<0.01'],
  },
};

function authCookie() {
  return { cookies: { access_token: TOKEN } };
}

export default function () {
  // GET /api/todos
  const res = http.get(`${BASE_URL}/api/todos`, authCookie());
  const ok = check(res, {
    'GET /api/todos → 200': (r) => r.status === 200,
    'response is array':    (r) => Array.isArray(JSON.parse(r.body)),
  });
  errorRate.add(!ok);

  sleep(1);
}
