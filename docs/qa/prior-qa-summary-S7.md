# Prior QA Summary for Stage 7

**Project:** citizen-cafe-link-shortener
**Prepared by:** Cartman
**Covers:** Stages 1–6 QA reports + production-reality-report.md

---

## Critical Context: The db.ts Regression Chain

This project has experienced a persistent DB connectivity regression across Stages 5 and 6 that Kenny must not repeat in Stage 7.

### What happened

**Pre-Stage 5 (original, working):**
`db.ts` used `createPool({ connectionString: env.DATABASE_URL })` with an explicit connection string. This was correct but Kenny tried to fix a secondary issue (the `(pool as any).sql` cast) by replacing it with a bare re-export.

**Stage 5 "fix" (broke production):**
`import { sql } from '@vercel/postgres'; export { sql };` — Butters approved this as it passed local tests. However, `@vercel/postgres`'s global `sql` named export reads `POSTGRES_URL` at query time (not `DATABASE_URL`). Since only `DATABASE_URL` is set in Vercel, every DB query throws `VercelPostgresError: missing_connection_string`.

**Stage 6 (confirmed same broken code):**
Cartman attempted to re-merge "the correct fix" but the same bare re-export pattern shipped again. Production still broken.

**Why tests passed but production failed:** Local Jest tests mock the `sql` function entirely, so they never exercise the `@vercel/postgres` auto-discovery path. The bug is invisible in the test suite.

---

## Stage 7 Required Pattern (non-negotiable)

```typescript
// src/lib/db.ts
import { createPool } from '@vercel/postgres';

const pool = createPool({
  connectionString: process.env.DATABASE_URL,
});

export const sql = pool.sql.bind(pool);
```

**Why `.bind(pool)` is required:** `pool.sql` is a method that references `this.connectionString` internally. Without `.bind(pool)`, `this` is undefined when called as a tagged template, and the pool's connection string is lost.

**Why `process.env.DATABASE_URL` (not `getEnv().DATABASE_URL`):** The pool is constructed at module scope (once). `getEnv()` also reads `process.env` — but at Vercel runtime, `DATABASE_URL` is available directly. Using `process.env.DATABASE_URL` is correct and simpler. Do NOT add lazy initialisation to `db.ts` — the pool construction is safe at module scope at runtime.

---

## Recurring Patterns and Anti-Patterns

### Anti-patterns to avoid in Stage 7

1. **Bare `import { sql } from '@vercel/postgres'`** — this is the bug. Do NOT use.
2. **`(pool as any).sql`** — unsafe cast that fails silently when `.sql` doesn't exist. Do NOT use.
3. **`createPool()` without a `connectionString`** — same as bare sql re-export; reads `POSTGRES_URL`. Do NOT use.
4. **`getEnv().DATABASE_URL` at module scope** — env.ts is lazy, but pool construction at module scope is fine with `process.env.DATABASE_URL` directly at runtime.
5. **Wrapping `pool.sql` in an arrow function** — e.g., `` const sql = (strings, ...values) => pool.sql(strings, ...values) `` — this breaks tagged-template semantics. Use `.bind(pool)`.

### Conventions established in prior stages

- **Strict TypeScript:** All files use strict TS. No `as any` casts in `lib/` files.
- **Test isolation:** DB is always mocked in unit tests. Integration/smoke tests against real Vercel URLs are Tweek's responsibility.
- **Build must pass:** `npm run build` must succeed with zero TS/lint errors before PR is opened.
- **Test count:** Must not decrease from 63.
- **No `POSTGRES_URL` references** in source code. The architecture mandates `DATABASE_URL` as the single canonical DB env var (PRD L10/L11).

### Butters QA patterns

- Stage 5 QA passed the bare `sql` re-export — it was wrong because local tests mock `sql` and never hit the auto-discovery path. In Stage 7, Butters should add a specific test asserting `createPool` is called with `{ connectionString: process.env.DATABASE_URL }` to prevent this class of regression.
- Butters checks AgentShield, TypeScript errors, lint, test coverage, and acceptance criteria. All must pass.

---

## Stage-by-Stage Highlights

| Stage | Result | Key Finding |
|-------|--------|-------------|
| 1 | PASS (A) | 19 tests, 100% coverage, migration idempotent, no POSTGRES_URL refs |
| 2 | PASS (A) | 48 tests, 95.91% coverage, dedup via ON CONFLICT correct |
| 3 | PASS (A) | 55 tests, brand design correct, no NEXT_PUBLIC_SHORTEN_API_KEY |
| 4 | PASS | 57 tests, lazy getEnv() singleton, build passes |
| 5 | PASS (A) | 63 tests, 96.42% coverage — but introduced bare sql re-export bug |
| 6 | PASS_WITH_FIXES | Same bare re-export pattern confirmed and shipped — production still broken |

---

## Stage 7 Acceptance Criteria Summary

Kenny must verify ALL of the following before marking dev complete:
1. `db.ts` uses `createPool({ connectionString: process.env.DATABASE_URL })` + `pool.sql.bind(pool)`
2. No bare `import { sql } from '@vercel/postgres'` in `db.ts`
3. No `POSTGRES_URL` reference anywhere in source
4. `tests/db.test.ts` passes with mocks updated to mock `createPool` (not bare `sql`)
5. New test asserts `createPool` receives `{ connectionString: process.env.DATABASE_URL }`
6. `npm test` passes with ≥63 tests
7. `npm run build` passes with no errors
