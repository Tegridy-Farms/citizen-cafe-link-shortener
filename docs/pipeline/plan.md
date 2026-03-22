# Implementation Plan: Citizen Cafe TLV Link Shortener

**Project ID:** citizen-cafe-link-shortener
**Author:** Cartman (CTO)
**Date:** 2026-03-22

---

## Project Size Assessment

**Tier: Medium** — 10–30 files, full-stack (Next.js App Router, Neon Postgres), build tooling (package.json, TypeScript, Tailwind). Single DB table, 1 API route, 2 human-facing pages, ~5 components, and Zod validation. Max stages allowed: **3–5**. This plan uses **3 stages** (plus Stage 4 production fix), within the medium-tier cap.

**Reasoning:** The app is end-to-end full-stack (migrations → API route → SSR redirect → frontend form), but has very narrow scope: one table, two pages, no auth system, no ORM. Three stages map cleanly to: scaffold + DB, API logic, and frontend UI. No stage justification needed for extras — three is already the minimum. Stage 4 is a post-pipeline production-fix stage added after Tweek's smoke test reported PRODUCTION_VERIFICATION_FAILED.

---

## Stage 1: Scaffold, Migrations, and Core Library

**Objective:** Bootstrap the Next.js project with all config, run the `links` DB migration, and wire up the shared `db.ts`, `env.ts`, and `schemas.ts` modules that every subsequent stage depends on.

**Implements:** R-007, R-008

**Prerequisites:** None (first stage)

**Architecture:**
- `DATABASE_URL` is the **only** canonical DB env var; `@vercel/postgres` client must be constructed explicitly with `DATABASE_URL` — never auto-read from `POSTGRES_URL`.
- `src/lib/env.ts` centralises all `process.env` reads and throws at boot if required vars are missing (`DATABASE_URL`, `SHORTEN_API_KEY`, `APP_BASE_URL`).
- `src/lib/db.ts` exports a single SQL client instance; all route handlers import from here — never scatter `process.env.DATABASE_URL` across route files.
- Migration file: `migrations/001_create_links.sql` — uses `CREATE TABLE IF NOT EXISTS` (idempotent per R-008). Schema: `id SERIAL PRIMARY KEY`, `shortcode TEXT NOT NULL UNIQUE`, `original_url TEXT NOT NULL UNIQUE`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`. The `UNIQUE` on `original_url` is the deduplication constraint (R-012).
- CI: copy `.github/workflows/ci.yml` from `company/templates/github-actions-ci-nextjs.yml`. `DATABASE_URL` must be added as a GitHub Actions secret.

**Design:**
No UI in this stage. Stage 1 is infrastructure only — directory structure, config, and shared lib modules.

**Product Note:**
The migration must be idempotent (`CREATE TABLE IF NOT EXISTS`) so running it twice on Neon does not error (R-008). Kenny should run `psql $DATABASE_URL -f migrations/001_create_links.sql` on the provisioned Neon DB after completing this stage. The acceptance criteria for schema correctness must be verified by introspecting the DB (not just asserting the SQL file exists).

**Test strategy:** strict

### Files to Create/Modify

| File Path | Action | Purpose |
|-----------|--------|---------|
| `package.json` | create | Dependencies: next@^14.2, react@^18.3, react-dom@^18.3, typescript@^5.3, tailwindcss@^3.4, @vercel/postgres@^0.10, nanoid@^5.0, zod@^3.22, class-variance-authority@^0.7, clsx@^2.1, tailwind-merge@^2.3, jest@^29.7, ts-jest@^29.1 |
| `next.config.ts` | create | Next.js config (App Router enabled) |
| `tailwind.config.ts` | create | Tailwind config with brand color tokens and breakpoints per design bible |
| `tsconfig.json` | create | TypeScript config with strict mode, path aliases (`@/*` → `src/*`) |
| `migrations/001_create_links.sql` | create | `CREATE TABLE IF NOT EXISTS links (...)` per R-007/R-008 schema |
| `src/lib/env.ts` | create | Boot-time env var reader; throws if `DATABASE_URL`, `SHORTEN_API_KEY`, or `APP_BASE_URL` are missing |
| `src/lib/db.ts` | create | `@vercel/postgres` client constructed with `DATABASE_URL`; exports typed `sql` helper |
| `src/lib/schemas.ts` | create | Zod: `ShortenRequestSchema` (`url`: http/https string, `key`: string); `ShortenResponseSchema` |
| `src/types/index.ts` | create | Shared TS types: `ShortenResponse`, `LinkRecord` |
| `.env.example` | create | Documents `DATABASE_URL`, `SHORTEN_API_KEY`, `APP_BASE_URL` — no real values |
| `.github/workflows/ci.yml` | create | Copied from `company/templates/github-actions-ci-nextjs.yml`; `DATABASE_URL` secret required |

### Acceptance Criteria — Stage 1

1. [ ] `migrations/001_create_links.sql` runs against the Neon Postgres DB with `psql $DATABASE_URL -f migrations/001_create_links.sql` without error, and running it a second time also produces no error (idempotent — R-008).
2. [ ] After running the migration, introspecting the DB confirms the `links` table has exactly four columns: `id` (int4/serial, NOT NULL), `shortcode` (text, NOT NULL, UNIQUE), `original_url` (text, NOT NULL, UNIQUE), `created_at` (timestamptz, NOT NULL, default `now()`) — exact schema contract per R-007.
3. [ ] `src/lib/env.ts` throws a descriptive error at module-load time if any of `DATABASE_URL`, `SHORTEN_API_KEY`, or `APP_BASE_URL` are absent from `process.env`.
4. [ ] `src/lib/db.ts` constructs the `@vercel/postgres` client using only `DATABASE_URL`; no reference to `POSTGRES_URL` or any alternate key exists anywhere in the codebase.
5. [ ] Unit tests for `src/lib/schemas.ts` (in `tests/schemas.test.ts`) pass: `ShortenRequestSchema` accepts `{ url: "https://example.com", key: "abc" }`, rejects `{ url: "not-a-url", key: "abc" }` (returns error), and rejects `{ url: "", key: "abc" }` (returns error) — covering R-003 validation logic.
6. [ ] `npm run build` succeeds with no TypeScript errors.
7. [ ] `.github/workflows/ci.yml` is present; README documents that the `DATABASE_URL` GitHub Actions secret is required for CI build.

### Estimated Complexity

**Complexity:** M

---

## Stage 2: API Route — Shorten + Redirect

**Objective:** Implement `POST /api/shorten` (key auth, URL validation, deduplication, insert) and the `GET /[shortcode]` RSC redirect route (302 → original URL or branded 404).

**Implements:** R-001, R-002, R-003, R-004, R-005, R-006, R-007, R-012

**Prerequisites:** Stage 1 complete (migration run, `db.ts`, `env.ts`, `schemas.ts` in place)

**Architecture:**
- `app/api/shorten/route.ts` — Route Handler (POST only). Steps: (1) parse body with `ShortenRequestSchema.safeParse`; on failure return 400 `{ error: "Invalid URL" }` or appropriate message. (2) compare `key` against `env.SHORTEN_API_KEY`; on mismatch return 401 `{ error: "Unauthorized" }`. (3) deduplication: `INSERT INTO links (shortcode, original_url) VALUES ($1, $2) ON CONFLICT (original_url) DO NOTHING RETURNING *`; if no row returned, `SELECT * FROM links WHERE original_url = $1` for the existing row. (4) on new insert: return 201 `{ url: APP_BASE_URL + "/" + shortcode }`; on existing: return 200 `{ url: APP_BASE_URL + "/" + shortcode }`. Shortcode collision retry: up to 3 attempts with fresh `nanoid(10)` on UNIQUE violation on `shortcode`.
- **API Consumer Contract:** `POST /api/shorten` returns `{ "url": "<APP_BASE_URL>/<shortcode>" }` — a wrapped object. HTTP 201 = new record; HTTP 200 = existing dedup match. All 4xx/5xx errors return `{ "error": "<message>" }`. The frontend form MUST parse the response as `{ url: string }`, NOT as a raw string.
- `app/[shortcode]/page.tsx` — RSC. Imports `db.ts`, runs `SELECT original_url FROM links WHERE shortcode = $1`. If found: `redirect(original_url)` (triggers 302). If not found: calls `notFound()` which renders `not-found.tsx`. `notFound()` is the mechanism Next.js App Router uses to return a 404 status.
- `app/not-found.tsx` — renders `NotFoundPage` component (shell only in this stage; branding applied in Stage 3). Must return HTTP 404.
- `src/lib/api/shorten.ts` — typed client-side fetch wrapper: `postShorten(url: string, key: string): Promise<ShortenResponse>`. Used by the homepage form in Stage 3.
- `tests/dedup.test.ts` — unit tests for the deduplication SQL logic (mock DB).

**Design:**
`NotFoundPage` in Stage 2 is a minimal placeholder — just the HTTP 404 status and a text message. Full Citizen Cafe branding (logo, colors, font) is applied in Stage 3.

**Product Note:**
Per open question 1 in the PRD: the `key` field is read from the JSON request body only (not from `Authorization` header). Document this decision as a comment in `route.ts`. If Make/Integromat ever sends it as a header, the route handler can be extended to check both; do not pre-implement header auth.

**Test strategy:** strict

### Files to Create/Modify

| File Path | Action | Purpose |
|-----------|--------|---------|
| `app/api/shorten/route.ts` | create | POST /api/shorten handler — auth, Zod validation, dedup upsert, nanoid, 201/200/401/400/500 |
| `app/[shortcode]/page.tsx` | create | RSC: DB lookup → `redirect()` (302) or `notFound()` (404); R-005, R-006 |
| `app/not-found.tsx` | create | Next.js App Router 404 boundary — minimal placeholder returning HTTP 404 |
| `src/lib/api/shorten.ts` | create | Typed fetch wrapper `postShorten(url, key)` → `ShortenResponse`; used by Stage 3 form |
| `tests/dedup.test.ts` | create | Unit tests: deduplication logic returns existing shortcode on duplicate original_url; new shortcode on new URL |
| `tests/schemas.test.ts` | modify | Extend with route-level integration test stubs if applicable |

### Acceptance Criteria — Stage 2

1. [ ] `POST /api/shorten` with valid URL and correct `SHORTEN_API_KEY` returns HTTP 201 and `{ "url": "<APP_BASE_URL>/<shortcode>" }` where `shortcode` matches `^[A-Za-z0-9_-]{8,12}$` — R-001, R-004.
2. [ ] `POST /api/shorten` with wrong or missing `key` returns HTTP 401 `{ "error": "Unauthorized" }` and creates no DB record — R-002.
3. [ ] `POST /api/shorten` with `url = ""` returns HTTP 400; `url = "not-a-url"` returns HTTP 400; no DB record created in either case — R-003.
4. [ ] Two consecutive `POST /api/shorten` calls with identical `url` return the same shortcode; only one record exists in the `links` table for that `original_url` — R-012.
5. [ ] `GET /<shortcode>` for a shortcode present in the DB responds with HTTP 302 and a `Location` header pointing to the `original_url` — R-005.
6. [ ] `GET /INVALIDCODE` (shortcode not in DB) responds with HTTP 404 — R-006. (Branding applied in Stage 3; HTTP status must be correct here.)
7. [ ] `tests/dedup.test.ts` and `tests/schemas.test.ts` all pass (`npm test`).
8. [ ] `npm run build` succeeds with no TypeScript errors.
9. [ ] No reference to `POSTGRES_URL` or hardcoded secrets anywhere in the new files.

### Estimated Complexity

**Complexity:** M

---

## Stage 3: Frontend UI — Branding, Homepage Form, and 404 Page

**Objective:** Build the complete Citizen Cafe–branded homepage (ShortenForm + BrandHeader) and the styled 404 page, applying all design-bible tokens (colors, fonts, spacing, interactions, accessibility).

**Implements:** R-006, R-009, R-010, R-011

**Prerequisites:** Stage 2 complete (`POST /api/shorten` and `GET /[shortcode]` working; `lib/api/shorten.ts` in place)

**Architecture:**
- `app/layout.tsx` — Root layout: loads `Assistant` font via `next/font/google` (weights 400, 500, 600, 700), sets `<html>` class, imports `globals.css`.
- `app/page.tsx` — Homepage: renders `PageShell` (centered variant) + `BrandHeader` (full) + `ShortenForm`. No inline form logic or raw fetch calls — all delegated to components and `lib/api/shorten.ts`.
- `app/not-found.tsx` — Upgraded to full branding: `PageShell` (error variant) + `BrandHeader` (minimal) + `NotFoundPage` component.
- `components/BrandHeader.tsx` — Renders `<Image src="/logo.svg">` (or `logo.png` fallback) via `next/image` with `priority`; `alt="Citizen Cafe Tel Aviv"`. Sizes: 280px desktop / 200px tablet / 160px mobile. Logo SVG geometry and fill (#FFE300, stroke #000) must not be altered via CSS.
- `components/ShortenForm.tsx` — Client component (`'use client'`). States: idle, submitting, success, error-api, error-validation. Uses `postShorten()` from `lib/api/shorten.ts` (never an inline `fetch()`). Client-side URL validation (must start with `http://` or `https://`) before any API call — R-011. Copy button uses `navigator.clipboard.writeText`; if unavailable, falls back to `user-select: all` on the URL display.
- `components/NotFoundPage.tsx` — Static content: H2 error heading, support text, ghost link to `/`.
- `components/BrandHeader.tsx`, `components/ui/` — shadcn/ui primitives (Button, Input) installed via `npx shadcn-ui@latest add button input`.
- `public/logo.svg` — Copy from `/home/openclaw/.openclaw/media/inbound/af353912-4c8e-43fc-97ae-5c98f0b9519f`.
- `public/logo.png` — Copy from `/home/openclaw/.openclaw/media/inbound/e9387038-105f-403d-854c-8aad17fe63f5.png`.
- **API Consumer Contract:** `ShortenForm` calls `postShorten(url, key)` which internally does `POST /api/shorten` and returns `{ url: string }`. The component reads `response.url` — never parses a raw string or array. HTTP 200 and 201 are both treated as success.

**Design:**
- Brand tokens: Background `#FFFFFF`, Accent Yellow `#FFE300`, Charcoal `#373230`, Error `#B91C1C`, Success `#065F46`, Muted `#7A756F`, Border `#E4E1DC`, Card Surface `#FAFAFA`.
- ShortenButton: `#FFE300` background, `#373230` text, 48px height, 8px radius. Focus ring: 3px solid `#373230` (dark ring on yellow). Hover: `#FFE033`. Active: `scale(0.98)`.
- InputField focus: 2px `#373230` border + 3px `#FFE300` box-shadow ring. Error state: 1px `#B91C1C` border, `aria-invalid="true"`, `aria-describedby` pointing to error `<p>`.
- Result block: `#FFFDE7` background, 1px `#FFE300` border, short URL in JetBrains Mono 14px + CopyButton.
- Interactions: result block slides in (translateY 12px→0 + opacity 0→1, 200ms). New submission after success fades result out (150ms).
- Accessibility: `aria-live="polite"` region for result announcement; `aria-live="assertive"` for validation errors; `ShortenButton` sets `aria-busy="true"` during load; CopyButton `aria-label` updates dynamically; `<form aria-label="Shorten a URL">`.
- Page `<title>`: Homepage → "Citizen Cafe TLV — Link Shortener"; 404 → "Link Not Found — Citizen Cafe TLV".

**Product Note:**
The `key` field in `ShortenForm` uses `type="password"` to obscure the value. The key is sent in the POST body to `/api/shorten` (via `postShorten()`); it is never embedded in the page HTML or JS bundle. No `NEXT_PUBLIC_SHORTEN_API_KEY` must exist.

**Test strategy:** pragmatic — this stage is presentational UI with interaction states. Visual and interaction acceptance criteria are verified manually. Automated unit tests cover client-side validation logic only.

### Files to Create/Modify

| File Path | Action | Purpose |
|-----------|--------|---------|
| `app/layout.tsx` | create | Root layout: Assistant font, global CSS, `<html>` class |
| `src/app/globals.css` | create | Tailwind directives, `:focus-visible` ring rules, monospace URL display |
| `app/page.tsx` | create | Homepage: PageShell + BrandHeader (full) + ShortenForm |
| `app/not-found.tsx` | modify | Upgrade from stub to full branding: PageShell + BrandHeader (minimal) + NotFoundPage |
| `components/BrandHeader.tsx` | create | Logo image, responsive sizing, `next/image priority` |
| `components/ShortenForm.tsx` | create | Client component: form, validation, `postShorten()`, result + copy button, all states |
| `components/NotFoundPage.tsx` | create | Static 404 content: heading, support text, ghost link to `/` |
| `components/ui/` | create | shadcn/ui Button and Input primitives (`npx shadcn-ui@latest add button input`) |
| `public/logo.svg` | create | Copy from media inbound (af353912…); must not be altered |
| `public/logo.png` | create | Copy from media inbound (e9387038…png) |

### Acceptance Criteria — Stage 3

1. [ ] Homepage (`/`) renders with Citizen Cafe logo visible (`<img>` or `<Image>` with `alt="Citizen Cafe Tel Aviv"`), background `#FFFFFF`, primary text `#373230`, and Shorten button background `#FFE300` — R-010.
2. [ ] Entering `"not-a-url"` in the URL field and clicking Shorten shows an inline error below the URL field without making an API call to `/api/shorten` — R-011.
3. [ ] Submitting a valid URL and correct API key from the homepage form displays the resulting short URL and a "Copy" button — R-009.
4. [ ] Clicking "Copy" writes the short URL to the clipboard; the button label changes to "✓ Copied!" for ~2 seconds then reverts — R-009.
5. [ ] Submitting with a wrong API key (server returns 401) shows an error message below the API Key field ("Invalid API key. Please check and try again.") — R-002 / R-009.
6. [ ] `GET /INVALIDCODE` returns HTTP 404 and renders a page with the Citizen Cafe logo and a human-readable error message (not a Next.js default error page) — R-006, R-010.
7. [ ] The API Key field uses `type="password"` to obscure the key value; `NEXT_PUBLIC_SHORTEN_API_KEY` does not exist in any file — R-002.
8. [ ] All interactive elements (URL input, API key input, Shorten button, Copy button) are keyboard-accessible in the correct tab order; focus rings are visible on all elements — R-010 (accessibility).
9. [ ] `npm run build` succeeds with no TypeScript or Tailwind errors.
10. [ ] The short URL displayed in the result block resolves correctly when opened in a browser (end-to-end smoke test: Flow 3 → Flow 2) — R-009, R-005.

### Estimated Complexity

**Complexity:** L

---

## Stage 4: Production Fixes — Missing Env Vars and Deployment Recovery

**Objective:** Resolve production smoke failures by adding missing Vercel env vars (`SHORTEN_API_KEY`, `APP_BASE_URL`) and triggering a clean production deployment.

**Implements:** R-001, R-002, R-004, R-009 (production readiness — all core requirements blocked by missing env vars)

**Prerequisites:** Stages 1–3 complete (all merged to main). Tweek's production-reality-report.md at `docs/qa/production-reality-report.md`.

**Context:** Tweek's smoke test reported PRODUCTION_VERIFICATION_FAILED on 2026-03-22:
- `SHORTEN_API_KEY` not set in Vercel (any target)
- `APP_BASE_URL` not set in Vercel (any target)
- Latest deployment `dpl_EuYcTsqt7F3uwALhzxLrxEjUeAHY` in ERROR state — build/boot fails at `src/lib/env.ts` startup validation
- `POST /api/shorten` returns 404 (API completely unreachable)

No code changes are required. The app code is correct; the environment configuration in Vercel is missing.

**Architecture:**
- `src/lib/env.ts` throws at boot if `SHORTEN_API_KEY` or `APP_BASE_URL` are missing. This is by design (Stage 1 AC #3). The fix is to provide the values in Vercel — not to weaken the boot guard.
- `APP_BASE_URL` must be set to `https://citizen-cafe-link-shortener.vercel.app` for production and preview targets. For development it may be `http://localhost:3000`.
- `SHORTEN_API_KEY` must be a non-empty secret value shared with the Make/Integromat automation caller.
- All three targets (production, preview, development) must have both vars set.
- After adding env vars, trigger a new Vercel deployment from the current `main` HEAD using `vercel --prod` or via the Vercel dashboard redeploy action.

**Test strategy:** strict — acceptance criteria are verified by Tweek's production smoke test (same checks as production-reality-report.md).

### Files to Create/Modify

| File Path | Action | Purpose |
|-----------|--------|---------|
| _(Vercel env vars)_ | configure | Add `SHORTEN_API_KEY` and `APP_BASE_URL` to Vercel project for production, preview, development targets |
| _(Vercel deployment)_ | trigger | `vercel --prod` or dashboard redeploy from main HEAD after env vars are set |

No source files change. This stage is purely operational.

### Acceptance Criteria — Stage 4

1. [ ] Vercel project env vars include `SHORTEN_API_KEY` (non-empty) for targets: production, preview, development — verified via `vercel env ls` or Vercel dashboard.
2. [ ] Vercel project env vars include `APP_BASE_URL=https://citizen-cafe-link-shortener.vercel.app` for targets: production, preview, development — verified via `vercel env ls`.
3. [ ] A new production deployment is triggered after both env vars are set, and the deployment reaches READY state (not ERROR).
4. [ ] `GET https://citizen-cafe-link-shortener.vercel.app/` returns HTTP 200.
5. [ ] `POST https://citizen-cafe-link-shortener.vercel.app/api/shorten` with valid URL and correct `SHORTEN_API_KEY` returns HTTP 201 and `{ "url": "https://citizen-cafe-link-shortener.vercel.app/<shortcode>" }`.
6. [ ] `GET https://citizen-cafe-link-shortener.vercel.app/<shortcode>` (shortcode from AC #5) returns HTTP 302 with correct `Location` header.
7. [ ] `GET https://citizen-cafe-link-shortener.vercel.app/INVALIDCODE` returns HTTP 404.

### Estimated Complexity

**Complexity:** S

---

## Stage Count Justification

3 planned stages for a Medium-tier project (max 5). Stage 4 is an unplanned production-fix stage added post-pipeline after Tweek reported PRODUCTION_VERIFICATION_FAILED. Production-fix stages do not count against the original tier cap — they are operational recovery stages, not scope expansion.
