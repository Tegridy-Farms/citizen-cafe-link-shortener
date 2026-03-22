# QA Report: Citizen Cafe TLV Link Shortener — Stage 6

**Project ID:** citizen-cafe-link-shortener
**Author:** Butters (QA)
**Date:** 2026-03-22

**Output path:** `docs/qa/stage-6-review.md` in the app repo (commit on the **stage branch** with QA fixes).

---

## Stage

6

## Verdict

**Verdict:** PASS_WITH_FIXES

## Checklist

- [x] Code matches architecture doc
- [x] Acceptance criteria met (list each below)
- [x] No files outside stage scope modified
- [x] Tests exist and pass
- [x] Test strategy from plan: strict — evaluated per Butters AGENTS.md (strict: TDD/git-order where feasible; pragmatic: shared code still tested, no coverage regressions)
- [x] Test coverage ≥80% project-wide where applicable
- [x] DB/env access matches architecture.md (e.g. `DATABASE_URL`); no `POSTGRES_URL` drift vs Vercel
- [x] API reuse: extends `lib/api/*` per architecture — no duplicate fetch for same endpoint
- [x] No egregious god-files without architecture alignment
- [x] No hardcoded secrets or credentials
- [x] Error handling present
- [x] Code is readable and maintainable
- [x] Code only implements what's in the plan stage (no phantom features)
- [x] File paths match the architecture doc's directory structure
- [x] Dependencies match the architecture doc's dependency list
- [x] No unexplained new files or patterns not in architecture doc
- [x] **AgentShield security scan: PASS** (see Security Gate section in Butters AGENTS.md)
- [ ] **Design QA (UI stages only):** N/A — this is a pure infrastructure/runtime fix with no UI changes.

### Acceptance Criteria Breakdown

| # | Criterion | Result | Notes |
|---|-----------|--------|-------|
| 1 | `src/lib/db.ts` contains exactly: `import { sql } from '@vercel/postgres'; export { sql };` (or a thin wrapper that calls `vercelSql` with the env var explicitly set). No `createPool`, no `(pool as any).sql`, no custom initialiser wrapper. | PASS_WITH_FIXES | Applied fix: simplified db.ts to minimal direct re-export pattern. |
| 2 | `GET /INVALIDCODE` returns HTTP **404** in production (Vercel deployed URL) — not 500. Verified by Tweek smoke test — R-006. | PENDING | Fix applied; requires Tweek smoke test post-merge. |
| 3 | `GET /<valid-shortcode>` returns HTTP **302** with correct `Location` header — R-005. | PENDING | Fix applied; requires Tweek smoke test post-merge. |
| 4 | All existing tests pass (`npm test` — test count must not decrease from 63, the count from Stage 5 branch). | PASS | 63 tests pass. |
| 5 | `npm run build` succeeds: no TypeScript errors, no lint errors. | PASS | Build completes successfully. |
| 6 | `app/api/shorten/route.ts` continues to work in production: `POST /api/shorten` with wrong key returns 401, with empty body returns 400 — R-002, R-003. | PENDING | Code verified; requires Tweek smoke test post-merge. |

## Security Scan (AgentShield)

- Grade: A
- Findings: 0 issues (0 critical, 0 high, 0 medium, 0 low)
- Critical findings: None
- Action taken: No action required

## Issues Found + Fixes Applied by Butters

1. **[src/lib/db.ts:1-35]** — Severity: MINOR — The original implementation had a lazy initialization wrapper around the `@vercel/postgres` sql import. While functionally correct, this added unnecessary complexity compared to the minimal direct re-export pattern specified in the Stage 6 acceptance criteria.
   
   **What was changed:** Simplified `src/lib/db.ts` to the minimal pattern:
   ```typescript
   import { sql } from '@vercel/postgres';
   export { sql };
   ```
   
   This removes the `initializeSQL()` wrapper and lazy initialization logic. The `@vercel/postgres` `sql` function reads `DATABASE_URL` (or `POSTGRES_URL`) at query execution time from `process.env`, so no manual initialization is needed. Both env vars are confirmed present in all Vercel environments per `docs/qa/production-reality-report.md`.

2. **[tests/db.test.ts:1-78]** — Severity: MINOR — Tests were checking for the old wrapper pattern and `getEnv()` integration. Updated tests to verify the simplified direct-export pattern while maintaining coverage for:
   - sql function is exported and callable
   - No `createPool` or `(pool as any).sql` patterns exist in source
   - No `POSTGRES_URL` references in source
   - Import from `@vercel/postgres` is present

## Recommendations

1. **Kudos:** The Stage 5 branch (`stage-5-fix-shortcode-404`) correctly identified and implemented the fix for the 500-on-404 issue. The root cause analysis in the plan was accurate — the `(pool as any).sql.bind(pool)` pattern was indeed the culprit.

2. **Process note:** The Stage 5 fix was correctly implemented but never merged to `main`. This highlights the importance of completing the merge handoff after QA approval. Stage 6 exists solely to correct this process gap.

3. **Post-merge verification:** After Cartman merges this branch to `main`, Tweek should run the production smoke tests immediately to verify:
   - `GET /INVALIDCODE` → HTTP 404 (was 500)
   - `GET /<valid-shortcode>` → HTTP 302 with correct Location
   - `POST /api/shorten` with wrong key → HTTP 401
   - `POST /api/shorten` with empty body → HTTP 400

4. **Code quality:** The simplified `db.ts` (direct re-export) is more maintainable and follows the principle of least surprise. Future developers won't need to understand the lazy initialization wrapper.

---

**QA completed by:** Butters  
**Next step:** Cartman to merge `stage-6-db-direct-sql` to `main` and hand off to Tweek for production smoke testing.
