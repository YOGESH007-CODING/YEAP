<div align="center">

<h1><code>Y</code>&nbsp;&nbsp;YEAP</h1>

<p><strong>Your Early AM Practice</strong></p>

<p>
  Spaced repetition for LeetCode. Sync your solves, let a tuned SM-2 engine schedule them,<br>
  and wake up to one email that says exactly what to review.
</p>

<p>
  <img alt="Node 18+" src="https://img.shields.io/badge/node-18%2B-4bdcc6?style=flat-square&labelColor=020203">
  <img alt="TypeScript 5" src="https://img.shields.io/badge/typescript-5-5e6ad2?style=flat-square&labelColor=020203">
  <img alt="Prisma + PostgreSQL" src="https://img.shields.io/badge/prisma-postgresql-bdc2ff?style=flat-square&labelColor=020203">
  <img alt="BullMQ 5" src="https://img.shields.io/badge/bullmq-5-ffb867?style=flat-square&labelColor=020203">
  <img alt="Jest" src="https://img.shields.io/badge/tests-jest-4bdcc6?style=flat-square&labelColor=020203">
  <img alt="Worker 04:00" src="https://img.shields.io/badge/worker-04%3A00%20daily-5e6ad2?style=flat-square&labelColor=020203">
</p>

<p><sub><code>ALGORITHM</code>&nbsp; SM-2 spaced repetition &nbsp;&nbsp;·&nbsp;&nbsp; <code>DELIVERY</code>&nbsp; morning review email</sub></p>

</div>

---

## `01` · Why it exists

Flashcards fail for algorithms because they test recall of an answer, not recall of a *pattern*.
YEAP treats every solved problem as a memory with a decay curve: it tracks the easiness factor of
each problem, the mastery of each topic behind it, and the kind of mistake you made (logic flaw,
edge case, syntax slip). Each morning it compiles the five problems you are closest to forgetting
and mails them to you before the day starts.

Everything below that line — the scheduling math, the queue compilation, the email — runs on a
server you control.

---

## `02` · Quick start

**Prerequisites** — Node.js 18+, PostgreSQL. Redis only if you want the daily worker.

```bash
# 1 · install (postinstall runs prisma generate)
npm install

# 2 · configure
cp .env.example .env      # set DATABASE_URL and a 32+ character JWT_SECRET

# 3 · migrate and seed
npm run prisma:migrate
npm run prisma:seed

# 4 · run the API
npm run dev               # http://localhost:3000

# 5 · run the web app (separate terminal)
cd frontend && npm install && npm run dev
```

Add the worker only on a persistent host — it needs Redis:

```bash
ENABLE_WORKER=true npm run dev
```

<details>
<summary><b>Other commands</b></summary>

| Command | What it does |
| :-- | :-- |
| `npm test` | Full Jest suite. `npm run test:watch` for watch mode. |
| `npm test -- --coverage` | Suite with a coverage report. |
| `npm run build` | `prisma generate` then `tsc` into `dist/`. |
| `npm start` | Run the compiled server from `dist/`. |
| `npm run prisma:studio` | Browse the database in Prisma Studio. |
| `npm run problems:sync` | Pull the 100 newest public LeetCode questions into the catalogue. |

</details>

---

## `03` · Tech stack

| | |
| :-- | :-- |
| **Runtime** | Node.js 18+ · TypeScript 5 (`strict`) |
| **HTTP** | Express 4 · Helmet · CORS · gzip compression |
| **Data** | PostgreSQL via Prisma ORM · `pg_trgm` GIN indexes for search |
| **Queue** | BullMQ 5 + ioredis, optional |
| **Email** | Resend |
| **Frontend** | React 19 · Vite · Tailwind v4 · TanStack Query |
| **Validation** | Zod |
| **Testing** | Jest + ts-jest |

<div align="center">
<br>
<sub><b>YEAP</b> · Your Early AM Practice &nbsp;&nbsp;·&nbsp;&nbsp; SM-2 Algorithm</sub>
</div>
