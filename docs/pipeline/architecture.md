# Architecture: Citizen Cafe TLV Link Shortener

**Project ID:** citizen-cafe-link-shortener
**Author:** Stan (Software Architect)
**Date:** 2026-03-22

---

## Tech Stack

| Layer         | Technology           | Version | Justification                                                                                |
|---------------|----------------------|---------|----------------------------------------------------------------------------------------------|
| Language      | TypeScript           | ^5.3    | Type safety across API shapes and DB results; Tegridy Farms standard.                       |
| Framework     | Next.js (App Router) | ^14.2   | Pre-specified in PRD; server components handle redirect at the edge with minimal code.       |
| Database      | PostgreSQL (Neon)    | ^15     | Pre-provisioned per PRD; single table, no ORM needed — plain SQL is the right tool.         |
| DB Client     | @vercel/postgres     | ^0.10   | Official Vercel/Neon integration; zero-config pooling from `DATABASE_URL`.                   |
| Short ID gen  | nanoid               | ^5.0    | Pre-specified in PRD; URL-safe, collision-resistant, tiny footprint.                         |
| Styling       | Tailwind CSS         | ^3.4    | Tegridy Farms standard; minimal utility classes sufficient for a single-page form.           |
| UI Components | shadcn/ui            | latest  | Tegridy Farms standard; accessible button/input primitives without a runtime bundle.         |
| Validation    | Zod                  | ^3.22   | Validates API request bodies (R-002, R-003); shared schema between server handler and optional client check. |
| Runtime       | Node.js (Vercel)     | ^20 LTS | Pre-provisioned Vercel deployment; no infrastructure decisions needed.                       |
| Testing       | Jest + ts-jest       | ^29/^29 | Unit-tests URL validation and deduplication logic without spinning up Next.js.               |

**No ORM** — one table, two columns of business data. An ORM adds migration overhead with no benefit at this scale. Trade-off: migrations are raw SQL files managed manually.

**No Auth middleware** — access control is a single secret-key comparison in the route handler (R-002). Trade-off: no session management, no JWT expiry; anyone who learns the key can shorten URLs. Acceptable for an internal tool; revisit if the key is ever rotated or shared widely.

---

## Environment Variables

Single source of truth for names. All server-side reads flow through `src/lib/db.ts` and `src/lib/env.ts` — never scattered `process.env.*` in route files.

| Name              | Environments                           | Consumed by                          | Notes                                                                                    |
|-------------------|----------------------------------------|--------------------------------------|------------------------------------------------------------------------------------------|
| `DATABASE_URL`    | production, preview, development       | `src/lib/db.ts`, migrations, CI      | Canonical Neon Postgres pooled URI. Must match Vercel env var exactly. **Never** use `POSTGRES_URL` or alternate keys anywhere in the codebase (per PRD L10/L11). |
| `SHORTEN_API_KEY` | production, preview, development       | `POST /api/shorten` route handler    | Secret compared server-side only. **Must NOT have `NEXT_PUBLIC_` prefix** — never shipped to the browser bundle. |
| `APP_BASE_URL`    | production, preview, development       | `POST /api/shorten` response builder | Base URL for returned short links (e.g. `https://citizen-cafe-link-shortener.vercel.app`). Allows a future custom domain swap without code changes (R-001, open question 3). |

If `@vercel/postgres` auto-reads `POSTGRES_URL` from the Vercel environment, the `src/lib/db.ts` module must explicitly pass `DATABASE_URL` to the client constructor to enforce the canonical key.

---

## System Architecture

### Components

| Component                | Responsibility                                                                  | Implements             | Communicates With                    |
|--------------------------|---------------------------------------------------------------------------------|------------------------|--------------------------------------|
| Next.js App Router       | Serves all pages and route handlers; SSR/static rendering                       | All UI requirements    | Route Handlers, Neon Postgres        |
| `POST /api/shorten`      | Validates key + URL; deduplicates; inserts `links` row; returns short URL       | R-001, R-002, R-003, R-004, R-007, R-012 | Neon Postgres via `src/lib/db.ts` |
| `GET /[shortcode]` (RSC) | Looks up shortcode in DB; issues `redirect()` (302) or renders 404 page        | R-005, R-006           | Neon Postgres via `src/lib/db.ts`    |
| Homepage (`/`)           | Branded single-page form for manual link creation                               | R-009, R-010, R-011    | `POST /api/shorten` (client fetch)   |
| 404 Page                 | Branded "not found" page returned when shortcode is unknown                     | R-006, R-010           | Rendered server-side                 |
| `src/lib/db.ts`          | Single DB client module; reads `DATABASE_URL` only                             | All data requirements  | Neon Postgres                        |
| `src/lib/env.ts`         | Centralises `process.env` reads; throws at boot if required vars are missing    | All env-dependent code | Consumed by `db.ts`, route handlers  |
| Neon Postgres            | Stores `links` table — single source of truth                                   | R-007, R-008           | Route handlers                       |
| Vercel CI/CD             | Builds and deploys on push to `main`                                            | Infra                  | GitHub repo                          |

### Data Flow

**API Link Creation (R-001):**
Caller → `POST /api/shorten` (Zod validates `url` + `key`) → compare key against `SHORTEN_API_KEY` → query `links` for existing `original_url` (R-012) → if exists: return 200 + existing shortcode; if not: `nanoid()` → INSERT into `links` → return 201 + `{ url: APP_BASE_URL + "/" + shortcode }`.

**Redirect (R-005):**
Browser → `GET /<shortcode>` (RSC) → `SELECT original_url FROM links WHERE shortcode = $1` → found: `redirect(original_url, 302)` → browser follows to destination; not found: render branded 404 page with HTTP 404.

**Manual Frontend Form (R-009):**
Browser → Homepage (`/`) → user fills form → client-side URL validation (R-011) → `POST /api/shorten` (relative `/api/shorten`) → on 201/200: render short URL + copy button; on error: render inline error message.

### Client–Server Integration

- **Server Components (RSC):** `app/[shortcode]/page.tsx` runs entirely server-side; calls `db.ts` directly — no fetch to own origin needed.
- **Client Components (`'use client'`):** Homepage form uses a relative path `fetch('/api/shorten', ...)` — browser hits same deployment, no base-URL configuration required.
- **`src/lib/api/shorten.ts`:** Single typed fetch wrapper for `POST /api/shorten`. Homepage imports this; no inline `fetch()` outside this module. If a second consumer appears, extend this module.

---

## Data Model

### `links`

**Implements:** R-007, R-008

| Field        | Type          | Constraints                  | Description                                    |
|--------------|---------------|------------------------------|------------------------------------------------|
| id           | SERIAL        | PRIMARY KEY                  | Auto-increment surrogate key                   |
| shortcode    | TEXT          | NOT NULL, UNIQUE             | 8–12 URL-safe alphanumeric chars (R-004)       |
| original_url | TEXT          | NOT NULL, UNIQUE             | Full original URL; UNIQUE enforces deduplication (R-012) |
| created_at   | TIMESTAMPTZ   | NOT NULL, DEFAULT NOW()      | Row creation timestamp                         |

**Deduplication strategy (R-012):** `original_url` has a UNIQUE constraint. On insert, use `INSERT ... ON CONFLICT (original_url) DO NOTHING RETURNING *` — if no row returned, `SELECT` the existing row. This is atomic and avoids a separate SELECT-then-INSERT race.

**Shortcode collision handling (R-004):** Generate with `nanoid(10)` (10-char, URL-safe alphabet). On `UNIQUE` violation on `shortcode`, retry up to 3 times. With a 10-char URL-safe alphabet (64 chars), collision probability is negligible at any realistic scale.

### Relationships

Single-table schema — no foreign keys. All business logic is contained in `links`.

---

## API Design

| Method | Endpoint        | Request Body / Params                      | Response                                                                  | Implements              |
|--------|-----------------|--------------------------------------------|---------------------------------------------------------------------------|-------------------------|
| POST   | `/api/shorten`  | `{ url: string, key: string }`             | 201 `{ url: "<APP_BASE_URL>/<shortcode>" }` (new) / 200 (existing) / 401 / 400 / 500 | R-001, R-002, R-003, R-004, R-007, R-012 |
| GET    | `/<shortcode>`  | path param: `shortcode`                    | 302 `Location: <original_url>` (found) / 404 branded page (not found)    | R-005, R-006            |
| GET    | `/`             | —                                          | 200 HTML — homepage form (R-009, R-010, R-011)                            | R-009, R-010, R-011     |

**Error shape (all 4xx/5xx from `/api/shorten`):**
```json
{ "error": "human-readable message" }
```

### API Consumer Contract

- `POST /api/shorten` returns a **wrapped object** `{ "url": "..." }` — never a raw string or array.
- HTTP 200 = existing record returned (deduplication); HTTP 201 = new record created. Automation callers that only check for `2xx` status are safe either way.
- The frontend form sends `Content-Type: application/json`; the route handler only reads from the JSON body (not query params or headers) for `url` and `key`.

### UX Data Contract

The homepage form does not display raw DB IDs — the `shortcode` field is the only DB value surfaced to users, as part of the displayed short URL.

---

## Directory Structure

```
citizen-cafe-link-shortener/
├── .github/
│   └── workflows/
│       └── ci.yml                      # Copied from company/templates/github-actions-ci-nextjs.yml
├── migrations/
│   └── 001_create_links.sql            # CREATE TABLE IF NOT EXISTS links (...); R-007, R-008
├── public/
│   ├── logo.svg                        # Citizen Cafe SVG lockup (from media inbound); R-010
│   └── logo.png                        # PNG fallback; R-010
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout: Assistant font (next/font/google), global styles
│   │   ├── page.tsx                    # Homepage — composes ShortenForm; R-009, R-010
│   │   ├── [shortcode]/
│   │   │   └── page.tsx               # RSC: DB lookup → redirect() or notFound(); R-005, R-006
│   │   └── api/
│   │       └── shorten/
│   │           └── route.ts           # POST /api/shorten handler; R-001–R-004, R-007, R-012
│   ├── components/
│   │   ├── ui/                         # shadcn/ui copied primitives (Button, Input, etc.)
│   │   ├── ShortenForm.tsx            # Client component: form, validation, copy button; R-009, R-011
│   │   ├── BrandHeader.tsx            # Citizen Cafe logo + layout; R-010
│   │   └── NotFoundPage.tsx           # Branded 404 content (composed by [shortcode]/page); R-006, R-010
│   ├── lib/
│   │   ├── db.ts                       # @vercel/postgres client; reads DATABASE_URL only
│   │   ├── env.ts                      # process.env reads with boot-time assertion; SHORTEN_API_KEY, APP_BASE_URL
│   │   ├── schemas.ts                  # Zod: ShortenRequestSchema (url + key); R-003
│   │   └── api/
│   │       └── shorten.ts             # Typed fetch wrapper: postShorten(url, key) → ShortenResponse
│   └── types/
│       └── index.ts                    # Shared TS types (ShortenResponse, LinkRecord)
├── tests/
│   ├── schemas.test.ts                 # Zod schema validation unit tests; R-003
│   └── dedup.test.ts                   # Deduplication logic unit tests; R-012
├── .env.example                        # Documents DATABASE_URL, SHORTEN_API_KEY, APP_BASE_URL (no real values)
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## File Boundaries

- `app/[shortcode]/page.tsx` — thin RSC: call `db.ts`, call `redirect()` or render `NotFoundPage`. No business logic. Target < 40 lines.
- `app/api/shorten/route.ts` — validation (Zod), auth check, dedup query, insert. Target < 80 lines; extract DB ops to `lib/db.ts` helpers if growing.
- `components/ShortenForm.tsx` — form state, client-side validation, fetch call via `lib/api/shorten.ts`, result display. Target < 150 lines.
- No god-files: `page.tsx` files compose components; they do not contain inline form logic or raw fetch calls.

---

## Local Development, CI, and Post-Deploy Checks

| Topic | Convention |
|-------|------------|
| **Local env** | Copy `.env.example` → `.env.local`; fill `DATABASE_URL` (Neon pooled URI), `SHORTEN_API_KEY` (any local secret), `APP_BASE_URL=http://localhost:3000`. |
| **Migrations** | `psql $DATABASE_URL -f migrations/001_create_links.sql` — idempotent (`CREATE TABLE IF NOT EXISTS`). Run once on fresh Neon DB or after cloning; R-008. |
| **CI** | `.github/workflows/ci.yml` copied from `company/templates/github-actions-ci-nextjs.yml`. Add `DATABASE_URL` as a GitHub Actions secret (required for `next build`). `SHORTEN_API_KEY` and `APP_BASE_URL` must also be set as secrets for tests that exercise the route handler. |
| **Post-deploy smoke URLs** | After each Vercel deploy, verify: `GET https://citizen-cafe-link-shortener.vercel.app/` → 200; `POST https://citizen-cafe-link-shortener.vercel.app/api/shorten` with correct key + valid URL → 201; `GET https://citizen-cafe-link-shortener.vercel.app/<returned_shortcode>` → 302; `GET https://citizen-cafe-link-shortener.vercel.app/INVALIDCODE` → 404. |
| **Security scan** | Run `bash /home/openclaw/.openclaw/scripts/agentshield-scan.sh` (or documented `npx ecc-agentshield` invocation in README) before QA hand-off to catch any accidentally committed secrets. |

---

## Security Considerations

1. **API key never in client bundle (R-002):** `SHORTEN_API_KEY` is read only in the Route Handler (server-side). No `NEXT_PUBLIC_` prefix. The frontend form sends the key field in the POST body, which travels over HTTPS; it is never embedded in the page HTML or JS bundle.
2. **No credential hardcoding:** All secrets (`DATABASE_URL`, `SHORTEN_API_KEY`, `APP_BASE_URL`) come from environment variables only. `.env` is gitignored; `.env.example` documents keys without values.
3. **Input validation (R-003):** All `POST /api/shorten` bodies are parsed through a Zod schema before touching the DB. Invalid input returns 400; SQL is never constructed from raw user strings.
4. **Parameterized queries only:** `@vercel/postgres` tagged template literals (`sql\`...\``) are parameterized by default. No string interpolation into SQL anywhere in the codebase.
5. **Redirect destination is stored, not reflected:** The `original_url` stored at link-creation time is what gets redirected to — the shortcode route never reads from query params or user input at redirect time. Prevents open-redirect via URL manipulation.
6. **No rate limiting at MVP (documented):** Per PRD non-goals, abuse protection is the secret key only. If the key is leaked, an attacker can create unlimited links. Mitigate by rotating `SHORTEN_API_KEY` via Vercel env var — no code change needed.

---

## Performance Considerations

1. **Redirect latency (R-005):** Single `SELECT shortcode FROM links WHERE shortcode = $1` with a UNIQUE index (implicit from constraint). Expected < 5ms query time on Neon; total 302 response target of < 300ms is comfortably met.
2. **Index on `original_url` (R-012):** UNIQUE constraint on `original_url` creates an implicit B-tree index; deduplication lookup is O(log n).
3. **Short code generation (R-004):** `nanoid(10)` is synchronous and microseconds fast; no performance concern.
4. **No caching layer at MVP:** Links are permanent (no TTL), so a Next.js `revalidate` cache on the redirect page is technically possible. Deferred — correctness risk of serving a stale redirect outweighs the latency gain at MVP scale.
5. **Bundle size:** `nanoid` (< 1KB) and `@vercel/postgres` are server-only; zero client-bundle impact. Recharts is not used in this project. The only client JS is the `ShortenForm` component + shadcn primitives.
6. **Collision retry (R-004):** Up to 3 `nanoid` retries on shortcode collision — negligible overhead; collision at 10-char URL-safe is astronomically unlikely before millions of links.

---

## Third-Party Dependencies

| Package              | Version Range | Purpose                               | Justification                                                                    |
|----------------------|---------------|---------------------------------------|----------------------------------------------------------------------------------|
| next                 | ^14.2         | Framework + routing + SSR             | Pre-specified in PRD tech constraints                                            |
| react                | ^18.3         | UI rendering                          | Required by Next.js                                                              |
| react-dom            | ^18.3         | DOM rendering                         | Required by Next.js                                                              |
| typescript           | ^5.3          | Static typing                         | Tegridy Farms standard                                                           |
| tailwindcss          | ^3.4          | Utility-first CSS                     | Tegridy Farms standard; minimal class usage for a single-form app                |
| @vercel/postgres     | ^0.10         | Neon Postgres client + pooling        | Official Vercel integration; zero-config with `DATABASE_URL`                     |
| nanoid               | ^5.0          | URL-safe shortcode generation         | Pre-specified in PRD; purpose-built for this exact use case                      |
| zod                  | ^3.22         | Schema validation for API request body| Prevents malformed DB writes; clean error messages for 400 responses             |
| class-variance-authority | ^0.7     | shadcn/ui variant utility             | Required by shadcn/ui components                                                 |
| clsx                 | ^2.1          | Conditional className utility         | Required by shadcn/ui                                                            |
| tailwind-merge       | ^2.3          | Merge Tailwind classes without conflict | Required by shadcn/ui                                                           |
| jest                 | ^29.7         | Test runner                           | Industry standard; sufficient for unit-testing validation and dedup logic        |
| ts-jest              | ^29.1         | TypeScript support for Jest           | Required for `.ts` test files                                                    |

---

## Critical Dependencies & Risks

1. **`DATABASE_URL` must be set before any work begins (L1/L10/L11):** CRITICAL pre-condition for development, QA, and CI. Verify in Vercel dashboard and GitHub Actions secrets before Kenny (developer) picks up a ticket.
2. **`SHORTEN_API_KEY` must be set in all environments:** Without it, every `POST /api/shorten` call returns 401. Set in Vercel and as a GitHub Actions secret.
3. **`APP_BASE_URL` for future custom domain (open question 3):** If Citizen Cafe switches from `citizen-cafe-link-shortener.vercel.app` to a custom domain (e.g. `go.citizencafe.co.il`), update only this env var in Vercel — no code change needed. Do not hardcode the Vercel domain anywhere in route handlers.
4. **Logo asset copy (R-010):** Wendy (Design) must copy `/home/openclaw/.openclaw/media/inbound/af353912-4c8e-43fc-97ae-5c98f0b9519f` → `public/logo.svg` and the `.png` → `public/logo.png` before the frontend is built. SVG colors (`#ffe300`, stroke `#000`) must not be altered.
5. **`key` in request body vs. header (open question 1):** Architecture assumes `key` in the JSON body per PRD spec. If Make/Integromat sends it as `Authorization: Bearer <key>`, the route handler checks both locations. Document the final decision in the route handler comment before Kenny implements.
