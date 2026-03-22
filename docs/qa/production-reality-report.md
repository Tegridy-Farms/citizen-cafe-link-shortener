# Production Reality Report: citizen-cafe-link-shortener
**Date:** 2026-03-22
**Deployed URL:** https://citizen-cafe-link-shortener.vercel.app
**Verdict:** BLOCKED

## Deployment readiness
| Field | Value |
|-------|-------|
| Polling enabled | yes |
| Deployment ID | dpl_9WPBqyLWdfDRhUf2GqTwkQdnCJ6c |
| Final state | READY |
| Error (if any) | None — build succeeded (Stage 5+6 fix deployed) |

## Env preflight
| Key | Required Targets | Present Targets | Status |
|-----|------------------|-----------------|--------|
| DATABASE_URL | production, preview, development | production, preview, development | PASS |
| SHORTEN_API_KEY | production, preview, development | development, preview, production | PASS |
| APP_BASE_URL | production, preview, development | development, preview, production | PASS |

## Route Smoke Test
| Route | Expected | Actual | Notes |
|-------|----------|--------|-------|
| / | 200 | 200 | OK — homepage loads with Citizen Cafe branding |
| /INVALIDCODE | 404 | 500 | **FAIL** — returns HTTP 500 instead of 404 |
| /test-shortcode | 404 | 500 | **FAIL** — returns HTTP 500 instead of 404 |
| /abc123 | 404 | 500 | **FAIL** — returns HTTP 500 instead of 404 |

## API probe
| Path | Expected | Actual | Notes |
|------|----------|--------|-------|
| POST /api/shorten (wrong key) | 401 | 401 | PASS — returns `{"error":"Unauthorized"}` (returns before DB call) |
| POST /api/shorten (empty body) | 400 | 400 | PASS — returns `{"error":"Invalid URL"}` (Zod validation, no DB call) |

**Note:** Both API probe tests return early before hitting the database — 401 (key mismatch) and 400 (Zod validation). They do NOT prove DB connectivity.

## Root Cause Analysis

**The `@vercel/postgres` `sql` export reads `POSTGRES_URL`, NOT `DATABASE_URL`.**

Source code analysis of `node_modules/@vercel/postgres/dist/chunk-7IR77QAQ.js` confirms:
- The global `sql` export is a lazy Proxy that calls `createPool()` on first use
- `createPool()` without a `connectionString` arg calls `postgresConnectionString('pool')`
- That function reads `process.env.POSTGRES_URL` — NOT `DATABASE_URL`
- Error message: `"You did not supply a 'connectionString' and no 'POSTGRES_URL' env var was found."`

**Only `DATABASE_URL` is set in Vercel** (confirmed in env preflight above). There is no `POSTGRES_URL` env var.

### Why the API route appeared to work
The API probe tests (401, 400) both return **before** any database query executes:
- Wrong key → 401 at auth check (no SQL)
- Empty body → 400 at Zod validation (no SQL)

A successful POST (with correct key + valid URL) would also 500 because it hits the DB.

### Stage 5/6 regression
The original `db.ts` (pre-Stage 5) used `createPool({ connectionString: env.DATABASE_URL })` — explicitly passing `DATABASE_URL`. The Stage 5/6 "fix" replaced this with `import { sql } from '@vercel/postgres'; export { sql };`, which removed the explicit connection string and relies on auto-discovery of `POSTGRES_URL` (which doesn't exist).

## Fix Required

**Option A (recommended):** Fix `src/lib/db.ts` to use `createPool({ connectionString: process.env.DATABASE_URL })` and export a working `sql` function from the pool:

```typescript
import { createPool } from '@vercel/postgres';

const pool = createPool({
  connectionString: process.env.DATABASE_URL,
});

export const sql = pool.sql.bind(pool);
```

**Important:** `pool.sql` is an async method on `VercelPool` — `.bind(pool)` is required. Call as: `await sql\`SELECT ...\`` (tagged template). The `sql` function from `pool.sql.bind(pool)` returns `Promise<QueryResult<T>>` — the caller expects `.rows` on the result.

**Option B (quick, but breaks architecture):** Add `POSTGRES_URL` env var in Vercel pointing to the same Neon connection string as `DATABASE_URL`. However, the architecture mandates `DATABASE_URL` as the single canonical key (per PRD L10/L11), so this is not recommended.

## Issues
1. **[/[shortcode]] — HTTP 500 for all dynamic routes** — `src/lib/db.ts` re-exports `sql` from `@vercel/postgres` which auto-reads `POSTGRES_URL` (not set). Every DB query throws `VercelPostgresError: missing_connection_string`. The `[shortcode]/page.tsx` RSC throws before reaching `notFound()`, causing 500 instead of 404.

2. **All DB-dependent routes are broken** — Any route that executes a SQL query will fail. This includes both the redirect flow (`GET /[shortcode]`) and the full API flow (`POST /api/shorten` with valid key + URL). Only routes that return early (auth/validation failures) appear to work.

## Classification
**BLOCKED — code_fix_required**

Env contract is complete (all 3 required vars present with correct targets). Deployment is READY. The bug is in `src/lib/db.ts` — it must use `createPool({ connectionString: process.env.DATABASE_URL })` instead of re-exporting `sql` from `@vercel/postgres` (which reads `POSTGRES_URL`).

## Handoff
- BLOCKED + code_fix_required: Cartman (fix `src/lib/db.ts` to pass `DATABASE_URL` explicitly to `createPool()`)
