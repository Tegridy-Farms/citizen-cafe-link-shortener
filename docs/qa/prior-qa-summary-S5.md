# Prior QA Summary for Stage 5: citizen-cafe-link-shortener
**Prepared by:** Cartman (CTO)
**Date:** 2026-03-22
**Covers:** Stage 1–4 QA reports + Production Reality Reports

---

## Overview

Four stages completed and merged. Two production smoke cycles run. The project has strong test coverage (57 tests, 96%+ line coverage) and clean AgentShield scores (Grade A, 0 findings). However, two consecutive production smoke cycles returned BLOCKED due to runtime issues not caught in the local `npm run build` / `npm test` pipeline. Stage 5 addresses the second and final production failure.

---

## Key Conventions Established

1. **`DATABASE_URL` is the sole DB env var.** No `POSTGRES_URL`, no alternate keys. All DB access goes through `src/lib/db.ts`. Verified in every stage review.

2. **`getEnv()` lazy singleton pattern.** `src/lib/env.ts` exports `getEnv()` (not top-level throws). All callers (`route.ts`, `db.ts`) call `getEnv()` inside function bodies — never at module scope. Established in Stage 4.

3. **`@vercel/postgres` direct `sql` import for API routes.** `app/api/shorten/route.ts` uses `sql` from `@/lib/db` which uses `(pool as any).sql.bind(pool)`. This worked for the API route but appears to fail at Vercel runtime for the RSC page. **Stage 5 must replace `(pool as any).sql` with the direct `sql` tagged template export from `@vercel/postgres`.** This is the primary suspect for the 500 error.

4. **`notFound()` must not be caught.** In Next.js App Router, `notFound()` internally throws a special error that the framework intercepts to set HTTP 404. Any `try/catch` that does not explicitly re-throw `notFound()`'s error will convert it to a 500. The current `[shortcode]/page.tsx` has no try/catch, so the failure is upstream in the `sql` helper throwing before `notFound()` is reached.

5. **`nanoid` shortcode length:** 10 characters, alphanumeric + hyphen/underscore. Established in Stage 2 — do not change.

6. **Dedup via `ON CONFLICT (original_url) DO NOTHING RETURNING *`** — returns 0 rows when the URL already exists; caller then does a SELECT to fetch the existing row. This pattern is tested and working in production (API routes pass). Do not touch dedup logic in Stage 5.

---

## Regressions to Avoid

1. **Don't re-introduce eager env validation.** Stage 4 fixed `env.ts` to be lazy. Stage 5 must not add any top-level `getEnv()` calls or `process.env.*` reads outside function bodies in any modified file.

2. **Don't break the API route.** `app/api/shorten/route.ts` currently works in production (returns 401/400 as expected). Stage 5 changes to `db.ts` must be backward-compatible — the API route uses the same `sql` helper and must continue to work.

3. **Don't alter `app/not-found.tsx` or any component.** The branded 404 UI renders correctly (confirmed by production report — the RSC payload contains the right content). The fix is purely in the DB query helper and the RSC page's error propagation path.

4. **Don't reduce test count below 57.** Stage 4 ended at 57 tests. Any new tests Kenny adds are additive; existing tests must continue to pass.

---

## Recurring QA Fixes (for Kenny to avoid repeating)

- **Stage 3:** No issues found by Butters — clean first pass.
- **Stage 4:** No issues found by Butters — clean first pass (lazy env implemented correctly).
- **Production smoke 1 (pre-Stage 4):** Build crash on Vercel due to eager `env.ts` throw at module scope. Root cause was that `SHORTEN_API_KEY` and `APP_BASE_URL` are not injected at build time on Vercel. Fixed in Stage 4.
- **Production smoke 2 (this report):** `GET /[shortcode]` returns HTTP 500 instead of 404. Build succeeds, env vars present. Root cause is a runtime error in the `sql` helper or `notFound()` being absorbed before reaching the Next.js 404 boundary.

---

## Stage 5 Focus

**Single goal:** Make `GET /[shortcode]` return HTTP 404 for missing shortcodes and HTTP 302 for found ones.

**Primary fix target:** `src/lib/db.ts` — replace `(pool as any).sql.bind(pool)` with the direct `sql` named export from `@vercel/postgres`. The `sql` tagged template from `@vercel/postgres` is the documented, supported API for running parameterised queries with Neon/Vercel Postgres. The `createPool().sql` cast is undocumented and untested against the Vercel Node.js runtime.

**Secondary check:** Confirm `src/app/[shortcode]/page.tsx` has no `try/catch` that catches the `notFound()` throw without re-throwing. Current source shows no try/catch — this is correct. Do not add one.

**Acceptance tests:** Tweek re-runs production smoke. Stage 5 is done when `GET /INVALIDCODE` returns 404 and `GET /<valid>` returns 302 on the live Vercel deployment.
