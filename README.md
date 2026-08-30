# Gantodo

계층형 할일 관리 + 타임라인(간트 차트)을 결합한 웹 애플리케이션입니다.

---

## 주요 기능

- **계층형 태스크** — 부모-자식 관계로 태스크를 트리 구조로 관리
- **타임라인 뷰** — 간트 차트로 일정과 진행 상황을 시각화
- **Google OAuth2 로그인** — Google 계정으로 간편 로그인, JWT 기반 인증
- **게스트 모드** — 로그인 없이 즉시 사용, 로컬스토리지에 저장
- **데이터 마이그레이션** — 게스트로 작성한 태스크를 로그인 후 계정으로 가져오기
- **유저별 데이터 분리** — 로그인 유저는 각자의 태스크만 조회·수정
- **가중치 설정** — 형제 태스크 간 상대적 비중(0~100)을 그룹 단위로 편집, 타임라인 진행도에 반영

---

## 기술 스택

### Backend
- Java 21, Spring Boot
- Spring Security (OAuth2 Client, JWT)
- Spring Data JPA, Flyway
- MySQL 8.0

### Frontend
- React 18, TypeScript
- Vite
- Tailwind CSS

### Infra
- Docker, Docker Compose
- AWS EC2
- GitHub Actions (CI/CD) — `main` 브랜치 push 시 GHCR 이미지 빌드 후 EC2 자동 배포

---

## 아키텍처

```
[React SPA]
    │  HTTP (REST API)
    ▼
[Spring Boot API]
    │  JPA
    ▼
[MySQL]
```

**인증 흐름**
```
브라우저 → /oauth2/authorization/google
         → Google 동의 화면
         → 백엔드 콜백 처리
         → JWT (access_token, refresh_token) HttpOnly 쿠키 발급
         → 프론트 리다이렉트
```

**게스트 흐름**
```
비로그인 접속 → /api/public/auth/me (인증 미확인)
             → localStorage 기반 CRUD
             → 로그인 후 서버 마이그레이션 (부모→자식 순 업로드)
```

---

## 로컬 실행

### 사전 준비
- Java 17+
- Node.js 18+
- Docker

### 1. DB 실행
```bash
docker compose -f docker/docker-compose.yml up -d
```

### 2. 백엔드 실행
```bash
cd todo-api
./gradlew bootRun
```

### 3. 프론트엔드 실행
```bash
cd todo-web
npm ci
npm run dev
```

접속: `http://localhost:5173`

### 환경 변수 (todo-api)
| 변수 | 설명 |
|------|------|
| `GOOGLE_CLIENT_ID` | Google OAuth2 클라이언트 ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth2 클라이언트 시크릿 |
| `JWT_SECRET` | JWT 서명 키 |
| `DB_URL` | DB 접속 URL (기본값: `jdbc:mysql://localhost:3308/gantodo_db`) |
| `DB_USERNAME` | DB 유저 (기본값: `gantodo`) |
| `DB_PASSWORD` | DB 비밀번호 (기본값: `gantodo1234`) |

---

## 구현 포인트

### 게스트 → 로그인 마이그레이션

게스트 모드에서 로그인하면 localStorage에 저장된 태스크를 서버 DB로 옮깁니다.

**벌크 전송 방식 채택**

초기 구현은 위상 정렬된 태스크를 `POST /api/todos`로 순차 호출했습니다. 태스크가 N개면 N번 왕복이 발생하고, 부모의 서버 ID를 받아야 자식 요청을 보낼 수 있어 병렬화도 불가능한 구조였습니다.

이를 `POST /api/todos/bulk` 단일 요청으로 전환했습니다. 클라이언트는 `clientTempId` / `parentClientTempId`(클라이언트 UUID)를 함께 전송하고, 서버가 순서대로 처리하며 UUID → DB ID 매핑을 직접 관리합니다.

**멱등성 보장**

네트워크 오류로 응답을 받지 못한 채 재시도하면 태스크가 중복 생성될 수 있습니다. 다음 세 가지 방안을 검토했습니다.

| 방안 | 내용 | 검토 결과 |
|------|------|-----------|
| A. `clientTempId` DB 저장 | `todos` 테이블에 `client_temp_id` 컬럼 추가, `(user_id, client_temp_id)` 유니크 제약으로 중복 차단 | **채택** — 별도 인프라 없이 DB 레벨 보장 |
| B. Idempotency-Key 헤더 | 요청마다 UUID 헤더 전송, 서버가 키+응답을 캐싱해 재시도 시 동일 응답 반환 | 미채택 — 영속·다중 인스턴스 공유를 위해 Redis 등 별도 저장소 필요. 인메모리(Spring Cache)로 대체 시 재배포 휘발·인스턴스 간 미공유·동시 재시도 레이스 문제가 남고, A가 DB 레벨에서 더 강한 보장을 제공하므로 불필요 |
| C. 클라이언트 락 | 마이그레이션 시작 전 localStorage에 락 설정, 성공 시 해제 | **채택** — 락이 남아있으면 로그인 전환 시점에 자동 재시도 트리거 |

A는 DB 레벨 최후 방어선, C는 불필요한 재요청 자체를 줄이는 역할로 상호 보완합니다.

**청크 단위 전송**

벌크 요청에 항목 수 제한이 없으면 단일 요청으로 서버에 과도한 부하를 줄 수 있습니다. 이를 방지하기 위해 두 곳에서 청크 크기를 50으로 제한합니다.

- 백엔드: `POST /api/todos/bulk` 요청당 최대 50개 (`@Size(max = 50)`)
- 프론트엔드: 위상 정렬된 전체 목록을 50개 단위 청크로 나눠 순차 전송

**50을 상한으로 잡은 근거**

- **트랜잭션 길이 ↔ write 경합.** `bulkCreate`는 단일 `@Transactional` 안에서 N개 INSERT를 묶어 처리하므로, N이 클수록 락 보유 시간이 길어져 로드 테스트에서 병목으로 확인된 *POST/PATCH write 경합*을 악화시킵니다. 50은 마이그레이션이 일반 쓰기 경로의 경합을 과도하게 키우지 않는 보수적 상한입니다.
- **페이로드 크기.** 항목 한 건(제목 + UUID 2개 + 날짜 + weight)이 대략 수백 바이트라, 50개여도 단일 요청은 수십 KB 수준으로 서버 바디 한도 대비 충분히 여유가 있습니다.
- **재시도 낭비 상한.** 청크는 멱등 재시도의 단위이므로, 청크 크기가 곧 중간 실패 시 버려지는 작업량의 상한입니다. 50이면 최악의 경우에도 재처리 범위가 한 청크로 제한됩니다.

청크 경계를 넘는 부모-자식 관계는 서버에서 처리합니다. 각 청크 처리 시 현재 배치의 `clientTempId`뿐 아니라 `parentClientTempId`도 DB에서 함께 조회하므로, 이전 청크에서 저장된 부모를 올바르게 연결합니다.

중간에 실패해도 멱등성(`clientTempId`)이 보장되므로 처음부터 재시도하면 이미 저장된 청크는 건너뛰고 실패한 지점부터 이어집니다.

### 로드 테스트 & 성능 개선

K6로 세 가지 시나리오를 **AWS EC2 클라우드 환경**(k6 러너와 앱 서버를 동일 VPC 내 별도 인스턴스로 분리, t3.medium ×2)에서 측정했습니다.

| 시나리오 | VU | 에러율 | p95 | 처리량 | 판정 |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Smoke | 5 | 0% | 196ms | — | ✅ 임계값(500ms) 통과 |
| Load | 50 | 0% | 22ms | 26.59 req/s | ✅ 임계값(1s) 통과 |
| Cascade Stress | 100 | 0% | 894ms | 127.48 req/s | 측정 목적 |

**Recursive CTE 최적화**

부모 상태 변경(COMPLETED↔TODO) 시 전체 트리를 DB에서 조회해 애플리케이션 레벨 BFS로 자식을 탐색하던 구조를, MySQL 8.0 Recursive CTE로 교체해 대상 노드의 자손 ID만 조회하도록 수정했습니다. 동일 환경 before/after 측정 결과 cascade 쿼리 p95가 **5.46s → 2.41s(-56%)**, 전체 p95가 2.84s → 1.36s(-52%)로 개선됐고, 유저의 할일 규모와 무관하게 일정한 성능을 보입니다.

측정 히스토리(로컬→클라우드 전환, before/after 상세)와 전체 수치는 [`k6/README.md`](k6/README.md)를 참고하세요.

### 유저별 데이터 격리
모든 Todo 쿼리는 `user_id` 기준으로 필터링하며, 수정·삭제 시 소유자 검증을 수행합니다.
컨트롤러에서 `@AuthenticationPrincipal`로 이메일을 추출하고, 서비스에서 유저를 조회해 처리합니다.

### 인증 감지
`/api/public/auth/me` 엔드포인트로 인증 여부를 먼저 확인한 후 API 호출 여부를 결정합니다.
비로그인 상태에서 불필요한 API 호출을 방지합니다.
