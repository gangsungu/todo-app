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
