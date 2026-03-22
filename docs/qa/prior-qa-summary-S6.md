# Prior QA Summary for Stage 6: citizen-cafe-link-shortener
**Prepared by:** Cartman (CTO)
**Date:** 2026-03-22
**Covers:** Stage 1–5 QA reports + both Production Reality Reports

---

## Overview

Five stages completed (Stages 1–4 merged, Stage 5 implemented but **not merged**). Three production smoke cycles attempted. The project has strong test coverage (63 tests on the Stage 5 branch, 57 on main, 96%+ line coverage) and clean AgentShield scores (Grade A, 0 findings). The root cause of all three production failures has been identified definitively.

---

## Root Cause (Definitive — Stage 6 must fix this)

**`src/lib/db.ts` on `main` uses `(pool as any).sql.bind(pool)`** — a non-existent or incorrectly bound method on a `createPool()` result. This throws at runtime on Vercel's Node.js environment when any SQL query is executed against a non-existent shortcode. Because the throw happens before `notFound()` is called, Next.js App Router catches it as an unhandled error and returns HTTP 500 (not 404).

**Stage 5 had the correct fix** — replacing `createPool()+(pool as any).sql` with `import { sql } from '@vercel/postgres'; export { sql }` — but PR #5 was never merged to `main`. Vercel has been deploying the old broken code on every push since Stage 4.

**Stage 6's single job:** implement the minimal `db.ts` on a new branch, get it merged to `main`, and let Tweek confirm production smoke passes.

---

## Key Conventions (established in prior stages — DO NOT BREAK)

1. **`DATABASE_URL` is the sole DB env var.** All DB access via `src/lib/db.ts`. No `POSTGRES_URL` references in source. Confirmed present in all Vercel environments.

2. **`getEnv()` lazy singleton.** `src/lib/env.ts` exports `getEnv()` — no top-level throws. All callers invoke `getEnv()` inside function bodies. **Stage 6 must NOT add any top-level `getEnv()` or `process.env.*` reads at module scope in `db.ts`.**

3. **`notFound()` must not be caught.** `app/[shortcode]/page.tsx` currently has no try/catch — this is correct. **Do not add one.** The fix is purely in `db.ts`.

4. **API route must remain working.** `app/api/shorten/route.ts` currently works in production (401/400 responses confirmed). The Stage 6 `db.ts` change must be backward-compatible — the API route uses `sql` from `@/lib/db` and must continue to work.

5. **`nanoid` shortcode length: 10 chars.** Do not touch `app/api/shorten/route.ts` in Stage 6.

6. **No `createPool` in `db.ts`.** Stage 6 must not re-introduce `createPool`. The `@vercel/postgres` `sql` named export is the documented, stable API for parameterised queries against Neon/Vercel Postgres.

---

## The Correct db.ts (Stage 6 target)

```ts
// src/lib/db.ts
import { sql } from '@vercel/postgres';
export { sql };
```

That's it. Two lines. `@vercel/postgres` reads `DATABASE_URL` (or `POSTGRES_URL`) from `process.env` at query time — no manual pool, no wrapper function, no lazy initialiser needed. The `sql` tagged template is already runtime-safe.

**If Kenny wants to add a JSDoc comment for clarity, that's fine. But no additional logic.**

---

## Tests to Update

- `tests/db.test.ts`: Remove any mocks for `createPool`. The test should simply verify that `sql` is a callable function (typeof === 'function') when imported from `@/lib/db`. If the test previously mocked `createPool` to prevent real DB calls, replace it with a mock of `@vercel/postgres`'s `sql` instead.
- All other test files (`tests/schemas.test.ts`, `tests/dedup.test.ts`, `tests/shortcode-route.test.ts`, `tests/env.test.ts`) must pass without modification.
- **Test count must not decrease from 63** (the count on the Stage 5 branch). If `tests/db.test.ts` previously had N tests, replace them with N equivalent tests targeting the new minimal `db.ts`.

---

## Production Reality Summary

| Smoke Cycle | Result | Root Cause |
|-------------|--------|------------|
| After Stage 3 merge | BLOCKED | `env.ts` eager throw at build time → build crashed on Vercel |
| After Stage 4 merge | BLOCKED | `(pool as any).sql.bind(pool)` throws at Vercel runtime; `GET /[shortcode]` returns 500 |
| After Stage 5 branch (not merged) | BLOCKED | Stage 5 fix correct but **never landed on main**; Vercel still running Stage 4 code |

---

## Regressions to Avoid

1. **Don't re-introduce eager env validation.** `db.ts` must not call `getEnv()` or read `process.env.*` at module scope.
2. **Don't re-introduce `createPool`.** Not needed; `sql` from `@vercel/postgres` manages connections internally.
3. **Don't alter `app/[shortcode]/page.tsx`.** It's correct as-is on main.
4. **Don't alter `app/not-found.tsx` or any component.** Branding and 404 UI are correct.
5. **Don't reduce test count below 63.**
