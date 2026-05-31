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

---

## 개선 후 재측정 (2026-05-25, Recursive CTE 적용)

> 변경 사항: `cascadeCompleted` / `cascadeTodo`에서 `findAllForTreeByUserId`(전체 트리 로드) 제거.
> Recursive CTE로 대상 노드의 자손 ID만 조회 후 해당 엔티티만 로드하도록 교체.

### Cascade Stress 재측정 (VU 100, 2분)

| 지표 | 기존 | 개선 후 | 변화 |
|------|------|---------|------|
| 에러율 | 0% | 0% | — |
| avg | 3.67s | 3.38s | **-8%** |
| median | 3.43s | 3.16s | **-8%** |
| p90 | 6.27s | 5.58s | **-11%** |
| p95 | 8.77s | 7.69s | **-12%** |
| max | 20.39s | 12.78s | **-37%** |
| 처리량 | 14.6 req/s | 17.5 req/s | **+20%** |

p95 1.1s 단축, max 7.6s 단축, 처리량 20% 향상.
쿼리 범위를 전체 유저 트리 → 대상 subtree로 좁힌 것만으로 고부하 구간의 큐잉 지연이 크게 줄었다.

> Stress 시나리오 조건: 유저당 cascade-root 1개 + 자식 10개, VU 100이 root를 COMPLETED↔TODO 반복 토글.

---

## 클라우드 환경 측정 (2026-05-31, AWS EC2)

> 환경: AWS ap-northeast-2, 앱 서버 t3.medium (Spring Boot + MySQL 8.0 Docker), k6 러너 t3.medium (별도 EC2, 동일 VPC Private 통신)
> 로컬 환경 대비 k6와 앱 서버가 분리되어 자원 경합 없는 순수 앱 성능 측정

### Smoke (VU 5, 30s)

| 지표 | 결과 | 임계값 | 판정 |
|------|------|--------|------|
| 에러율 | 0% | 0% | ✅ |
| p50 | 21ms | — | — |
| p90 | 100ms | — | — |
| p95 | 196ms | < 500ms | ✅ |
| p99 | 1.10s | — | — |
| max | 1.10s | — | — |

p99 = max = 1.10s는 JVM 콜드 스타트 1건 영향. p50 21ms로 워밍업 이후 응답은 정상.

---

### Load (VU 50, 5분 / 읽기 70% · 쓰기 30%)

| 지표 | 결과 | 임계값 | 판정 |
|------|------|--------|------|
| 에러율 | 0% | < 1% | ✅ |
| p50 | 7ms | — | — |
| p90 | 17ms | — | — |
| p95 | 22ms | < 1s | ✅ |
| p99 | 52ms | — | — |
| max | 312ms | — | — |
| create p95 | 25ms | — | — |
| update p95 | 19ms | — | — |
| 처리량 | 26.59 req/s | — | — |

로컬 p95(4.39s) 대비 **-99.5%**, 처리량 16.3 → 26.59 req/s(**+63%**). 로컬 측정값은 자원 경합으로 왜곡되어 있었음이 확인됨.

---

### Cascade Stress (VU 100, 2분 / COMPLETED↔TODO 반복)

| 지표 | 결과 | 로컬(CTE 후) | 변화 |
|------|------|-------------|------|
| 에러율 | 0% | 0% | — |
| avg | 384ms | 3.38s | **-88.6%** |
| p50 | 431ms | 3.16s | **-86.4%** |
| p90 | 671ms | 5.58s | **-88.0%** |
| p95 | 894ms | 7.69s | **-88.4%** |
| p99 | 1.09s | — | — |
| max | 1.89s | 12.78s | **-85.2%** |
| 처리량 | 127.48 req/s | 17.5 req/s | **+628%** |

에러율 0% 달성. cascade PATCH p95 894ms — 클라우드 분리 환경에서 Recursive CTE 최적화 효과가 온전히 반영됨.
