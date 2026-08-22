# Changelog

Commit-by-commit history of YEAP, newest first. Each entry lists the **commit hash**, **what**
changed, and **why**.

> Generated from `git log`. Where an original commit message was a placeholder (`Done`,
> `your commit message`, `Feat : ...`) or did not match its diff, the entry is reconstructed from
> the files actually changed and that discrepancy is noted.

---

## 2026-08-22

### `c8fb2c6` — Trim the README to an overview
- **What:** Cut ~215 lines from `README.md`, removing the architecture section and tightening the
  algorithm description.
- **Why:** The README had grown into deep internal documentation; reduce it toward a scannable
  overview.

### `2278a8e` — Gitignore review notes, Prisma URL fix, stronger text sanitization
- **What:** Added forensic review notes to `.gitignore`; removed the `postinstall` flag from the
  Prisma config and set a direct migration URL in `schema.prisma`; hardened `sanitizeUserText` to
  strip **all** HTML tags and code elements.
- **Why:** Keep working notes out of git, fix Prisma migration URL resolution, and close XSS gaps on
  user-supplied text.

### `0fe6902` — Dynamic connection pool + performance & email pass *(large)*
- **What:** Multiple changes squashed together:
  - `resolveDatabaseUrl` injects `DATABASE_CONNECTION_LIMIT` / `DATABASE_POOL_TIMEOUT` into the
    datasource URL at client construction (`prismaClient.ts`).
  - Restyled the daily review email to the frontend's "Obsidian Protocol" design tokens, with
    critical-count subject lines (`ResendNotificationProvider.ts`).
  - Extended `PrismaProblemProgressRepository` with `countGroupedByUser`, `countDueGroupedByUser`,
    `createManyForUser`, `findPageByUser`, `countByUser`; added `IUserRepository.findActive`.
  - `ReviewController` now returns `topicTags` and supports opt-in history pagination.
  - Dedicated Redis connection for the BullMQ worker; shared `createMasteryLookup` extracted for
    both worker entry points; added a `pg_trgm` trigram search migration.
- **Why:** Serverless and the daily worker need different pool sizes; the daily worker's per-user
  query fan-out is collapsed to a fixed count; search moves off sequential scans; the worker/queue
  stop sharing one blocking Redis connection; the email matches the product's design.

## 2026-08-20

### `aa65506` — Concise page title
- **What:** Shortened the `<title>` in `frontend/index.html`.
- **Why:** Cleaner browser-tab / SEO title.

## 2026-08-19

### `dc08545` — Mandatory LeetCode account linking
- **What:** New `LinkLeetcodePage`; updated `App.tsx`, `AppShell`, and `OAuthCallbackPage` to force
  new users through LeetCode linking.
- **Why:** A linked LeetCode handle is required for sync and scheduling, so gate new users until
  they provide one.

### `25ec7fd` — Sidebar layout redesign + theme provider *(large)*
- **What:** Reworked the layout to sidebar navigation and added theme-provider support; broad
  restyle across every page and UI component (`index.css` +280, Dashboard/History/Login/Review/
  Settings pages, `Header`, badges, buttons, inputs).
- **Why:** Modernize the UI and support light/dark theming.

### `830e6f9` — Frontend security headers
- **What:** Added security headers to `frontend/vercel.json`.
- **Why:** Harden the deployed frontend (CSP/HSTS and related headers).

### `7684f6c` — OAuth callback flow, theme toggle, sanitization util
- **What:** New `OAuthCallbackPage`, `ThemeToggle`, and `theme.tsx`; minor `AuthController` change;
  introduced `sanitizeUserText` with tests.
- **Why:** Complete redirect-based OAuth login, add a user theme toggle, and centralize text
  sanitization.

## 2026-08-17

### `1b4579b` — Remove dead company-tracker UI
- **What:** Deleted unused company-tracker code from `DashboardPage` (−34 lines).
- **Why:** Dead code cleanup.

### `c1ced08` — StreakCard / TopicHeatmap layout & perf
- **What:** Simplified `StreakCard` and `TopicHeatmap`; small `DashboardPage` adjustment.
- **Why:** Improve layout and rendering performance.

### `0a3e07e` — Add StreakCard and TopicHeatmap
- **What:** New `StreakCard` and `TopicHeatmap` dashboard components plus supporting CSS.
- **Why:** Surface streak and per-topic mastery progress on the dashboard.

### `ee36bcb` — Full-backlog retrieval + priority scoring
- **What:** `findDueByUser` accepts a limit of `0` meaning "entire backlog"; the Prisma repo sorts
  by `dueDate` and applies the limit conditionally; `QueueCompilationEngine` scores priority by
  easiness factor **and** topic mastery before capping; added tests for the priority logic.
- **Why:** Score priority across the whole backlog so weak topics surface, instead of pre-limiting
  by easiness factor.

### `591f5a5` — Vercel Analytics
- **What:** Added `@vercel/analytics` and mounted `<Analytics/>` in `App.tsx`.
- **Why:** Track user interactions.

### `4998879` — Dynamically load Vercel OG under CommonJS
- **What:** `ShareController` now imports `@vercel/og` dynamically.
- **Why:** `@vercel/og` is ESM-only; a dynamic import lets the CommonJS build load it to render the
  OG share image.

### `d648c02` — Memory layer + sharing *(large)*
- **What:** New Prisma models `UserMistake`, `UserTopicMastery`, `UserNote`, `UserStreak` (with
  migrations); `MemoryLayerService` and `StreakService`; `NoteController`, `StreakController`,
  `ShareController` and their routes; wired into `ReviewController` / `QueueCompilationEngine`.
- **Why:** Track the *kind* of mistake and per-topic mastery to inform scheduling, and add notes,
  streaks, and a public share card as growth features.

## 2026-08-13

### `b4a4d03` — Company tracking + problem sync
- **What:** `TrackerController` + routes + `TrackerDto`; schema and migration for trackers; rewrote
  `scripts/fetchLatestProblems.ts`; GitHub Actions daily-worker tweak; README note.
- **Why:** Let users track target companies and sync company-tagged problems.

### `b54488e` — Email verification (OTP) *(message was a placeholder: "your commit message")*
- **What:** Reconstructed from the diff — `EmailVerificationService`,
  `emailVerificationRateLimit` middleware, verify/resend handlers in `AuthController`, schema +
  migration, `AuthDto`, `LoginPage` UI, `.env.example` entry.
- **Why:** Verify user email addresses via OTP, rate-limited separately from login.

### `b784695` — Regenerated Prisma client for deletion models *(artifact)*
- **What:** Commits only the regenerated Prisma client under `node_modules/.prisma/client`,
  reflecting the `AccountDeletionReauth` / `AccountDeletionAudit` models and `User` schema changes.
- **Why:** Byproduct of `prisma generate`; it lands in git because `node_modules` is tracked in this
  repo. No hand-written source in this commit.

### `b3858b5` — Progress-repo / queue refactor + auth rate limit *(message mislabeled)*
- **What:** The message says "secure account deletion", but the diff rewrites
  `PrismaProblemProgressRepository` (~97 lines), adjusts `QueueCompilationEngine`, makes minor
  `SyncSubmissionsUseCase` / `LeetCodeGraphQLClient` / `ReviewController` changes, and adds an
  `authRateLimit` rule. (The actual account-deletion feature is `a0b3ce3`.)
- **Why:** Repository/query cleanup and rate-limiting; the commit message appears copied from a
  neighbouring change.

## 2026-08-05

### `f417722` — Tolerate missing bonus-review data
- **What:** `DashboardPage` guards against an absent bonus-review payload.
- **Why:** Prevent a crash when bonus-review data isn't present.

### `f6d2e54` — LeetCode signup + FAANG bonus reviews
- **What:** Added FAANG-company bonus reviews and LeetCode-based signup across `DashboardPage`
  (heavily simplified, −171), `LoginPage`, `AuthDto`, `AuthController`, `ReviewController`.
- **Why:** Offer bonus practice on FAANG-tagged problems and streamline signup.

## 2026-08-04

### `a0b3ce3` — Account deletion with OAuth reauth + rate limiting
- **What:** `DeleteAccountUseCase`, `AccountDeletionCacheService`, `AccountDeletionEmailService`;
  `csrfProtection`, `requestContext`, and `accountDeletionRateLimit` middleware; schema + migration;
  `SettingsPage` UI; `TokenService` tweak.
- **Why:** Allow secure, auditable account deletion (reauthentication, CSRF protection, rate
  limiting, soft-delete + cleanup).

### `328798f` — SearchCombobox a11y + sync error handling
- **What:** Keyboard navigation and ARIA improvements to `SearchCombobox`; sync-error handling in
  `DashboardPage`; small `api.ts`, `Badge`, and `vercel.json` changes.
- **Why:** Accessibility and clearer UX when a sync fails.

### `e0fb3a3` — Rename `versel.json` → `vercel.json` *(message misleading)*
- **What:** The message says "update environment variables", but the diff is purely a rename of the
  misspelled `frontend/versel.json` to `frontend/vercel.json` (no content change).
- **Why:** Fix the filename so Vercel actually reads the config.

### `f2b9d83` — SPA rewrite rule
- **What:** Added a rewrite (all traffic → `index.html`) in `frontend/versel.json`.
- **Why:** Fix single-page-app deep-link / refresh 404s.

### `7b8bc79` — SPA 404 iteration
- **What:** Adjusted the rewrite in `frontend/versel.json` (net −3 lines).
- **Why:** Continued iterating on the SPA 404 fix.

### `6bffb7d` — SPA refresh fix
- **What:** Added rewrite config (8 lines) to `frontend/versel.json`.
- **Why:** Resolve the SPA refresh 404 issue.

### `218c290` — Regenerated Prisma client *(artifact)*
- **What:** Commits only the regenerated Prisma client for a schema config tweak.
- **Why:** Byproduct of `prisma generate`; tracked because `node_modules` is in git.

### `f027bb7` — Schema config tweak
- **What:** 2-line change to `prisma/schema.prisma`.
- **Why:** Adjust schema configuration.

## 2026-07-31

### `cf7f5a1` — Remove `.env` from git tracking
- **What:** Untracked `.env`.
- **Why:** Stop committing secrets to the repository.

### `ef08b9e` — Trim tracked `.env`
- **What:** Removed 30 lines from the still-tracked `.env`.
- **Why:** Reduce committed secrets (a step toward `cf7f5a1`). Original message (`Updated .env`) was
  uninformative.

### `b42f124` — BullMQ worker, GitHub Actions, Vercel serverless *(large)*
- **What:** Stood up the BullMQ worker (`queueSetup`, `runWorkerOnce`, worker tests); added
  `.github/workflows/daily-worker.yml` and `vercel.json`; changes to `LeetCodeGraphQLClient`,
  `AuthController`, `PrismaUserRepository`; added an `ErrorBoundary` and `fetchLatestProblems`
  script. Also (re)committed `.env` / `.env.example`.
- **Why:** Establish the daily worker (BullMQ + cron), a CI worker workflow, and serverless config.

## 2026-07-22

### `274b2d3` — "Done" *(no-op)*
- **What:** Touches `.env` with zero insertions/deletions (mode/whitespace or empty commit).
- **Why:** Unclear — recorded for completeness; the message was just "Done".

### `51cfd4f` — Dark-theme UI migration + dev token generator
- **What:** Restyled UI components and pages to a modern dark theme (large deletions, −964); added a
  developer token-generator utility.
- **Why:** Modernize the UI and simplify local authentication during development.

## 2026-07-16

### `2f211a8` — Remove environment file
- **What:** Deleted the tracked `.env` (22 lines).
- **Why:** Secret hygiene.

### `fccfac8` — Remove gitignore / env templates *(also committed build artifacts)*
- **What:** Deleted `.gitignore`, renamed `.env.example` → `.env`, and — apparently unintentionally —
  committed a full `coverage/` report and `.DS_Store`.
- **Why:** Intent per message was to drop the gitignore and env templates; the coverage artifacts
  and `.DS_Store` look accidental.

### `f98e926` — Initial production-ready YEAP application
- **What:** Project inception — full backend (domain `SrsEngine`, use cases, Prisma repositories,
  controllers, routes, worker skeleton), frontend (React + Vite pages and UI kit), Prisma schema +
  migrations + large problem-seed JSON, tests, and tooling config.
- **Why:** First commit establishing the application.
