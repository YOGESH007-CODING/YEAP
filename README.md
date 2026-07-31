# YEAP — Your Early AM Practice 🌅

> A LeetCode Spaced Repetition System (SRS) backend built on clean architecture,
> the SM-2 algorithm, with optional Redis/BullMQ-powered daily email delivery.

---

## Architecture

```
[Client / Frontend]
       │ (JWT / Google Auth)
       ▼
[Express Controllers] ──(DTOs)──► [ReviewUseCaseProcessor] ──► [SrsEngine (Pure SM-2)]
       │                                     │
       ▼                                     ▼
[ILeetCodeClient]                     [IRepositories]
       │                                     │
       ▼ (GraphQL)                           ▼ (Prisma Client)
[LeetCode API]                        [PostgreSQL DB]
                                             │
                              [BullMQ Daily Queue]
                                      │
                                      ▼
                           [Worker → Resend Email]
```

### Layer Boundaries
- `src/domain/` — Zero dependencies. Pure math + interfaces.
- `src/application/` — Orchestrates use cases via interface injection.
- `src/infrastructure/` — Prisma and GraphQL integrations.
- `src/shared/` — Logger, cross-cutting utilities.

---

## Quick Start

### 1. Prerequisites
- Node.js 18+, PostgreSQL

### 2. Install
```bash
npm install
npx prisma generate
```

### 3. Configure
```bash
cp .env.example .env
# Edit .env — set DATABASE_URL and JWT_SECRET
```

### 4. Migrate & Seed
```bash
npm run prisma:migrate
npm run prisma:seed
```

### 5. Run
```bash
npm run dev          # HTTP server
# API only (the default; suitable for Vercel)
npm run dev

# Persistent host only: enables Redis, the daily scheduler, and worker
ENABLE_WORKER=true npm run dev
```

### 6. Test
```bash
npm test             # Run all unit tests
npm test -- --coverage
```

---

## API Reference

All endpoints below except `/api/auth/*` require `Authorization: Bearer <accessToken>`.

### Authentication

`POST /api/auth/register` and `POST /api/auth/login` accept `{ "email", "password" }` (registration also accepts `name`).
`POST /api/auth/google` accepts `{ "idToken" }` from Google Identity Services. Each returns a 15-minute JWT access token and a rotating 30-day refresh token.

`POST /api/auth/refresh` and `POST /api/auth/logout` accept `{ "refreshToken" }`. Configure `JWT_SECRET` (32+ random characters) and `GOOGLE_CLIENT_ID` before use.

### `POST /api/review/submit`
Submit a completed review.

**Body:**
```json
{
  "problemId": "cljx8...",
  "qualityScore": 4
}
```

**Response:**
```json
{
  "success": true,
  "message": "Review submitted. Next review scheduled in 6 day(s).",
  "data": {
    "problemId": "...",
    "problemTitle": "Two Sum",
    "newInterval": 6,
    "newEasinessFactor": 2.5,
    "nextDueDate": "2024-01-17T04:00:00.000Z",
    "repetitions": 2,
    "qualityScore": 4
  }
}
```

### `GET /api/review/due`
Get all due problems for the authenticated user.

### `GET /health`
Health check (no auth required).

---

## SM-2 Algorithm

| Quality | Meaning | Interval Effect |
|---------|---------|-----------------|
| 0 | Complete blackout | Reset → 1 day |
| 1 | Incorrect | Reset → 1 day |
| 2 | Incorrect, easy recall | Reset → 1 day |
| 3 | Correct, hard | Advance, EF drops |
| 4 | Correct, hesitant | Advance, EF stable |
| 5 | Perfect recall | Advance, EF increases |

**EF floor:** `1.3` (never drops below)
**Due date normalization:** All scheduled dates are set to `4:00 AM UTC`

---

---

## Tech Stack
- **Runtime:** Node.js 18+ / TypeScript 5
- **HTTP:** Express 4
- **DB:** PostgreSQL via Prisma ORM
- **Queue/Scheduler:** BullMQ 5 + Redis (optional persistent worker)
- **Notifications:** Resend email API
- **Testing:** Jest + ts-jest
- **Validation:** Zod

## Daily review worker deployment

The HTTP API defaults to `ENABLE_WORKER=false`, so it needs neither Redis nor a
long-running process and can be deployed to Vercel unchanged. Run the worker on
a persistent service such as Railway, Render, or Fly.io with `ENABLE_WORKER=true`,
`REDIS_URL`, `RESEND_API_KEY`, and a verified `NOTIFICATION_FROM_EMAIL`.

The worker registers an idempotent BullMQ scheduler which runs at `0 4 * * *`
in `Asia/Kolkata` by default. Override this with `QUEUE_CRON` and
`QUEUE_TIMEZONE` when required.
