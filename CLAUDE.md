# CLAUDE.md

This file defines how Claude should work in this repository.
Keep changes small, safe, and consistent with existing architecture.

---

## 1) Project Overview

A web MVP for a **hierarchical (tree) todo list**.

- Backend: **Java / Spring Boot**, REST API
- Database: **MySQL** (local + production), **H2** may be used for quick local runs
- Frontend: **React** (SPA)
- Deployment: CI/CD automation is already set up (see `.github/workflows`)

Core features (MVP):
- Create / update / delete todos
- Hierarchical todos (parent-child)
- Reorder within same parent (optional but likely)
- Mark complete (and rule about children? define below)
- Basic health check endpoint

---

## 2) Repository Structure (adjust names if different)

- `todo-api/` : Spring Boot backend
- `todo-web/` : React frontend
- `.github/workflows/` : CI/CD pipelines
- `docs/` : (optional) architecture notes, API spec, ADR, etc.

If the structure differs, follow the existing repo layout.

---

## 3) Tech Constraints & Principles

### General
- Prefer **clarity + small diffs** over big refactors.
- Avoid introducing new libraries unless there is a clear benefit.
- Keep API and UI behavior consistent.

### Backend (Spring Boot)
- Layered structure:
    - `controller` → `service` → `repository` → `domain/entity`
- Use DTOs for request/response; do not expose entity directly.
- Validate inputs (`jakarta.validation`), return consistent error responses.
- Prefer transactional boundaries in service layer (`@Transactional`).
- Prevent N+1 issues; use fetch joins or query methods where needed.

### Frontend (React)
- Keep components small and testable.
- Prefer predictable state flow (no “magic” global state unless already used).
- API calls in a dedicated layer (`api/` or `services/`).
- Handle loading/error states.

---

## 4) Local Development

### Backend (`todo-api`)
Common commands:
- Run:
    - `./gradlew bootRun`
- Test:
    - `./gradlew test`
- Build:
    - `./gradlew clean build`

Local DB options:
- MySQL (recommended):
    - Use `application-local.yml` and set env vars below.
- H2 (quick run):
    - Allowed for early dev, but keep MySQL as source of truth for schema behavior.

Environment variables (example):
- `DB_HOST=localhost`
- `DB_PORT=3306`
- `DB_NAME=todo`
- `DB_USER=todo`
- `DB_PASSWORD=todo`
- `JWT_SECRET=...` (if auth exists)
- `CORS_ALLOWED_ORIGINS=http://localhost:3000`

### Frontend (`todo-web`)
Common commands:
- Install: `npm ci` (or `pnpm i` if repo uses pnpm)
- Run: `npm run dev` (or `npm start`)
- Build: `npm run build`
- Test: `npm test` (if configured)

---

## 5) API Conventions

- Base path: `/api`
- Versioning: If not already introduced, don’t add unless necessary.
- Response format:
    - Success: return resource DTO
    - Errors: return consistent structure (e.g., `{ code, message, details }`)

Minimum endpoints (example):
- `GET /api/health` → `{ "status": "OK" }`
- `GET /api/todos?parentId=` → list children (or tree)
- `POST /api/todos` → create
- `PATCH /api/todos/{id}` → update fields
- `DELETE /api/todos/{id}` → delete
- `POST /api/todos/{id}/move` → reorder/move (optional)

Hierarchical rules (choose what repo currently does; don’t invent new behavior):
- If marking a parent complete:
    - Option A: auto-complete all children
    - Option B: forbid if children incomplete
- If deleting:
    - Option A: cascade delete children
    - Option B: soft-delete and preserve tree
      Follow existing implementation.

---

## 6) Database & Migration Rules

- If Flyway/Liquibase exists: always add migrations, never manual prod edits.
- If not yet introduced:
    - Keep schema changes documented (SQL in `/docs/db/` or similar),
    - Avoid breaking changes without migration plan.

Indexes to consider (don’t add unless needed):
- `(parent_id, sort_order)`
- `(status, updated_at)`

---

## 7) CI/CD & Deployment Expectations

- Do not modify workflows unless necessary.
- If changing build steps, ensure:
    - Backend: tests pass, jar is built
    - Frontend: build succeeds
- Any env var changes must be reflected in:
    - workflow secrets / deployment config
    - README or docs

When updating deploy behavior:
- Keep rollback possibility (previous artifact/tag) in mind.
- Avoid changing infra configuration blindly.

---

## 8) How Claude Should Work Here

### Before coding
Claude should:
1. Identify target module (`todo-api` vs `todo-web`).
2. Locate the existing pattern (controller/service/repo, component structure).
3. Propose a minimal patch plan.

### While coding
- Prefer adding tests for service logic and critical controllers when feasible.
- Keep commits logically grouped (if user asks for commit messages, provide them).

### Never do
- Don’t rewrite architecture.
- Don’t rename packages/directories across the repo without strong reason.
- Don’t change API contracts unexpectedly.

### When uncertain
- If a decision affects behavior (e.g., cascade delete vs forbid delete),
  Claude should follow existing behavior in code, and if ambiguous, provide both options in comments and pick the safest default.

---

## 9) Quick Troubleshooting

- `http://localhost:8080/` shows error page:
    - Expected if there is no root mapping. Use `/api/health` instead.
- CORS issues:
    - Check allowed origins in backend config and front dev server port.
- MySQL connection errors:
    - Verify env vars and `application-local.yml`
    - Confirm DB user privileges.

---

## 10) Documentation Pointers

- If API spec exists: `docs/api.md`
- If ERD exists: `docs/erd.png` or `docs/db.md`
- If decisions are recorded: `docs/adr/`

## Pair Programming Mode

When assisting:
- Do not rewrite architecture
- Prefer minimal diff suggestions
- Identify hidden edge cases
- Highlight concurrency & integrity risks
- Suggest tests if logic changes

Keep docs updated when adding non-trivial features.