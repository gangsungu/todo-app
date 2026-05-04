# CLAUDE.md

이 파일은 이 저장소에서 Claude가 어떻게 동작해야 하는지 정의합니다.
변경은 작고, 안전하게, 기존 아키텍처와 일관되게 유지하세요.

---

## 1) 프로젝트 개요

**계층형(트리) 할일 목록** 웹 MVP입니다.

- 백엔드: **Java / Spring Boot**, REST API
- 데이터베이스: **MySQL** (로컬 + 운영), 빠른 로컬 실행 시 **H2** 사용 가능
- 프론트엔드: **React** (SPA)
- 배포: CI/CD 자동화 설정 완료 (`.github/workflows` 참고)

핵심 기능 (MVP):
- 할일 생성 / 수정 / 삭제
- 계층형 할일 (부모-자식 관계)
- 같은 부모 내 순서 변경 (선택 사항이지만 구현 가능성 높음)
- 완료 처리 (자식 항목 규칙은 아래 정의)
- 기본 헬스체크 엔드포인트

---

## 2) 저장소 구조

- `todo-api/` : Spring Boot 백엔드
- `todo-web/` : React 프론트엔드
- `.github/workflows/` : CI/CD 파이프라인
- `docs/` : (선택) 아키텍처 메모, API 명세, ADR 등

구조가 다를 경우 기존 저장소 레이아웃을 따르세요.

---

## 3) 기술 제약 및 원칙

### 공통
- 대규모 리팩터보다 **명확함 + 작은 diff**를 우선합니다.
- 명확한 이점이 없으면 새 라이브러리를 도입하지 않습니다.
- API와 UI 동작을 일관되게 유지합니다.

### 백엔드 (Spring Boot)
- 레이어드 구조:
    - `controller` → `service` → `repository` → `domain/entity`
- 요청/응답에 DTO를 사용하고, 엔티티를 직접 노출하지 않습니다.
- 입력값 검증 (`jakarta.validation`), 일관된 에러 응답을 반환합니다.
- 트랜잭션 경계는 서비스 레이어에 둡니다 (`@Transactional`).
- N+1 문제를 방지합니다. 필요 시 fetch join 또는 쿼리 메서드를 활용합니다.

### 프론트엔드 (React)
- 컴포넌트를 작고 테스트 가능하게 유지합니다.
- 예측 가능한 상태 흐름을 선호합니다 (기존에 사용 중인 게 아니면 "마법 같은" 전역 상태 지양).
- API 호출은 전용 레이어에 위치합니다 (`api/` 또는 `services/`).
- 로딩/에러 상태를 처리합니다.

---

## 4) 로컬 개발 환경

### 백엔드 (`todo-api`)
주요 명령어:
- 실행: `./gradlew bootRun`
- 테스트: `./gradlew test`
- 빌드: `./gradlew clean build`

로컬 DB 옵션:
- MySQL (권장): `application-local.yml` 사용 + 아래 환경 변수 설정
- H2 (빠른 실행): 초기 개발에는 허용하지만, 스키마 동작의 기준은 MySQL로 유지

환경 변수 (예시):
- `DB_HOST=localhost`
- `DB_PORT=3306`
- `DB_NAME=todo`
- `DB_USER=todo`
- `DB_PASSWORD=todo`
- `JWT_SECRET=...` (인증이 있는 경우)
- `CORS_ALLOWED_ORIGINS=http://localhost:3000`

### 프론트엔드 (`todo-web`)
주요 명령어:
- 설치: `npm ci` (pnpm 사용 시 `pnpm i`)
- 실행: `npm run dev` (또는 `npm start`)
- 빌드: `npm run build`
- 테스트: `npm test` (설정된 경우)

---

## 5) API 규칙

- 기본 경로: `/api`
- 버전 관리: 아직 도입하지 않았으면 필요할 때까지 추가하지 않습니다.
- 응답 형식:
    - 성공: 리소스 DTO 반환
    - 에러: 일관된 구조 반환 (예: `{ code, message, details }`)

최소 엔드포인트 (예시):
- `GET /api/health` → `{ "status": "OK" }`
- `GET /api/todos?parentId=` → 자식 목록 (또는 트리)
- `POST /api/todos` → 생성
- `PATCH /api/todos/{id}` → 필드 수정
- `DELETE /api/todos/{id}` → 삭제
- `POST /api/todos/{id}/move` → 순서 변경/이동 (선택)

계층 규칙 (현재 저장소 동작 기준, 새로운 동작 발명 금지):
- 부모를 완료 처리할 때:
    - Option A: 모든 자식 자동 완료
    - Option B: 자식이 미완료면 완료 금지
- 삭제할 때:
    - Option A: 자식 cascade 삭제
    - Option B: soft-delete 후 트리 보존

기존 구현을 따르세요.

---

## 6) 데이터베이스 & 마이그레이션 규칙

- Flyway/Liquibase가 있으면: 항상 마이그레이션을 추가하고, 운영 환경 직접 수정은 금지합니다.
- 아직 도입하지 않은 경우:
    - 스키마 변경 사항을 문서화합니다 (`/docs/db/` 등에 SQL 저장)
    - 마이그레이션 계획 없이 breaking change를 피합니다.

고려할 인덱스 (필요할 때만 추가):
- `(parent_id, sort_order)`
- `(status, updated_at)`

---

## 7) CI/CD & 배포

- 꼭 필요한 경우가 아니면 워크플로우를 수정하지 않습니다.
- 빌드 단계를 변경할 경우 확인 사항:
    - 백엔드: 테스트 통과, jar 빌드 성공
    - 프론트엔드: 빌드 성공
- 환경 변수 변경 시 반드시 반영:
    - 워크플로우 시크릿 / 배포 설정
    - README 또는 docs

배포 동작 수정 시:
- 이전 아티팩트/태그로 롤백 가능성을 고려합니다.
- 인프라 설정을 무분별하게 변경하지 않습니다.

---

## 8) Claude 작업 방식

### 코딩 전
1. 대상 모듈 파악 (`todo-api` vs `todo-web`)
2. 기존 패턴 파악 (controller/service/repo, 컴포넌트 구조)
3. 최소한의 패치 계획 제안

### 코딩 중
- 가능하면 서비스 로직과 핵심 컨트롤러에 테스트를 추가합니다.
- 커밋은 논리적으로 묶습니다 (커밋 메시지 요청 시 제공).

### 절대 하지 말 것
- 아키텍처를 재작성하지 않습니다.
- 강한 이유 없이 저장소 전체의 패키지/디렉터리 이름을 바꾸지 않습니다.
- API 계약을 예고 없이 변경하지 않습니다.

### 불확실할 때
- 동작에 영향을 미치는 결정(예: cascade delete vs 삭제 금지)은 기존 코드의 동작을 따릅니다.
- 모호한 경우 두 옵션을 주석으로 제시하고 가장 안전한 기본값을 선택합니다.

---

## 9) 빠른 트러블슈팅

- `http://localhost:8080/` 에러 페이지 표시:
    - 루트 매핑이 없으면 정상입니다. `/api/health`를 사용하세요.
- CORS 오류:
    - 백엔드 설정의 허용 오리진과 프론트 개발 서버 포트를 확인하세요.
- MySQL 연결 오류:
    - 환경 변수와 `application-local.yml` 확인
    - DB 사용자 권한 확인

---

## 10) 문서 위치

- API 명세: `docs/api.md`
- ERD: `docs/erd.png` 또는 `docs/db.md`
- 의사결정 기록: `docs/adr/`

---

## 페어 프로그래밍 모드

보조 시:
- 아키텍처를 재작성하지 않습니다
- 최소한의 diff 제안을 우선합니다
- 숨겨진 엣지 케이스를 파악합니다
- 동시성 & 무결성 위험을 강조합니다
- 로직 변경 시 테스트를 제안합니다

비자명한 기능 추가 시 문서를 최신 상태로 유지합니다.
