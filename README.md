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

---

## 기술 스택

### Backend
- Java 17, Spring Boot
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

### 계층 구조 마이그레이션
게스트 태스크를 서버로 옮길 때, 부모가 자식보다 먼저 생성되어야 `parentId`가 유효합니다.
클라이언트 UUID로 구성된 트리를 위상 정렬 후 순차 POST하고, `oldId → serverId` 맵으로 `parentId`를 재매핑합니다.

### 유저별 데이터 격리
모든 Todo 쿼리는 `user_id` 기준으로 필터링하며, 수정·삭제 시 소유자 검증을 수행합니다.
컨트롤러에서 `@AuthenticationPrincipal`로 이메일을 추출하고, 서비스에서 유저를 조회해 처리합니다.

### 인증 감지
`/api/public/auth/me` 엔드포인트로 인증 여부를 먼저 확인한 후 API 호출 여부를 결정합니다.
비로그인 상태에서 불필요한 API 호출을 방지합니다.
