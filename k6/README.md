# K6 로드 테스트

## 사전 준비

### 1. K6 설치
```bash
# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 \
  --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

### 2. DB 시드 실행 (tester11 ~ tester99 유저 생성)
```bash
mysql -h 127.0.0.1 -P 3308 -u gantodo -pgantodo1234 gantodo_db < k6/seed.sql
```

### 3. JWT 토큰 배치 생성
```bash
# todo-api 디렉터리에서 실행
# 인자: <jwt-secret> <start> <end> [hours]
cd todo-api
./gradlew generateTestTokens --args="<JWT_SECRET값> 11 99 24" > ../k6/tokens.json
```
`k6/tokens.json`은 gitignore 처리되어 있으며 로컬에서만 사용합니다.

### 4. 백엔드 실행
```bash
cd todo-api
./gradlew bootRun
```

---

## 시나리오 실행

### Smoke (기본 동작 확인 — VU 5, 30초)
```bash
# tester11 토큰 단건 사용
K6_TOKEN=$(jq -r '.[0]' k6/tokens.json) k6 run k6/smoke.js
```

### Load (일반 사용 패턴 — VU 50, 5분)
```bash
k6 run k6/load.js
```

### Cascade Stress (병목 검증 — VU 100, 2분)
```bash
k6 run k6/stress.js
```

> Load / Stress 는 `tokens.json`을 직접 읽으므로 별도 환경변수 불필요

---

## 임계값 기준

| 시나리오 | VU  | p95 목표 | 에러율 목표 |
|----------|-----|----------|------------|
| Smoke    | 5   | < 500ms  | 0%         |
| Load     | 50  | < 1s     | < 1%       |
| Stress   | 100 | 측정 목적 | —         |

> Stress는 임계값 통과가 아닌 cascade 전체 로드 방식의 한계를 수치로 확인하는 것이 목적입니다.

---

## 테스트 결과 (2026-05-24, 로컬 환경)

> 환경: WSL2 + Docker MySQL 8.0, Spring Boot, JVM 워밍업 포함

### Smoke (VU 5, 30s)

| 지표 | 결과 | 임계값 | 판정 |
|------|------|--------|------|
| 에러율 | 0% | 0% | ✅ |
| p95 응답시간 | 24ms | < 500ms | ✅ |
| p90 응답시간 | 15ms | — | — |
| max | 1.46s | — | — |

max 1.46s는 JVM 초기 워밍업 영향.

---

### Load (VU 50, 5분 / 읽기 70% · 쓰기 30%)

| 지표 | 결과 | 임계값 | 판정 |
|------|------|--------|------|
| 에러율 | 0% | < 1% | ✅ |
| http_req_failed | 0% | — | — |
| p95 응답시간 | 4.39s | < 1s | ❌ |
| p90 응답시간 | 2.72s | — | — |
| avg | 703ms | — | — |
| create p95 | 7.5s | — | — |
| update p95 | 3.7s | — | — |
| 처리량 | 16.3 req/s | — | — |

에러율 0% 달성. p95가 임계값 초과 — 50 VU 동시 쓰기 시 MySQL write 경합 발생. GET 중간값(4.73ms)은 빠르나 POST/PATCH가 병목.

---

### Cascade Stress (VU 100, 2분 / COMPLETED↔TODO 반복)

| 지표 | 결과 |
|------|------|
| 에러율 | 0% |
| http_req_failed | 0% |
| checks (PATCH 200) | 100% |
| avg | 3.67s |
| median | 3.43s |
| p90 | 6.27s |
| p95 | 8.77s |
| max | 20.39s |
| 처리량 | 14.6 req/s |

에러 없이 완료. cascade PATCH 1건에 평균 3.67s — Load 테스트 PATCH(3.7s) 대비 유사하나 max 20s는 100 VU 동시 요청으로 인한 큐잉 지연. 현재 구조(`findAllForTreeByUserId` 이중 호출)의 한계가 수치로 확인됨.

**개선 방향:** Recursive CTE로 subtree만 조회하도록 교체 시 cascade 쿼리 범위가 줄어 p95/max 개선 예상.
