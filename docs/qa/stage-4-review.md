# QA Report: Citizen Cafe TLV Link Shortener — Stage 4

**Project ID:** citizen-cafe-link-shortener
**Author:** Butters (QA)
**Date:** 2026-03-22

**Output path:** `docs/qa/stage-4-review.md` in the app repo (commit on the **stage branch** with QA fixes).

---

## Stage

4

## Verdict

**Verdict:** PASS

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
- [x] **Design QA (UI stages only):** N/A — this is an infrastructure/runtime fix with no UI changes.

### Acceptance Criteria Breakdown

| # | Criterion | Result | Notes |
|---|-----------|--------|-------|
| 1 | `npm run build` completes successfully with no errors | PASS | Build completed successfully. "Collecting page data" phase passed for `/api/shorten` and all other routes. |
| 2 | Importing `src/lib/env.ts` with NO env vars set does NOT throw | PASS | `env.test.ts` AC#2 verified: `expect(() => require('../src/lib/env')).not.toThrow()` passes. |
| 3 | `getEnv()` returns correct values when all vars are set | PASS | `env.test.ts` AC#3 verified: all three env vars returned correctly. |
| 4 | `getEnv()` throws when a required var is missing | PASS | `env.test.ts` AC#4 verified: throws with message containing the missing var name for each of DATABASE_URL, SHORTEN_API_KEY, APP_BASE_URL. |
| 5 | `app/api/shorten/route.ts` has zero top-level env references | PASS | Verified: `getEnv()` is called only inside the `POST` handler function (line 22). No module-scope env access. |
| 6 | `app/[shortcode]/page.tsx` has zero top-level env references | PASS | Verified: page.tsx does not import from `@/lib/env` at all; uses `sql` from `@/lib/db` which handles its own lazy env access. |
| 7 | All existing tests continue to pass (test count ≥55) | PASS | 57 tests pass (was 55 in Stage 3, +2 new env tests). |
| 8 | `npm run build` succeeds with no TypeScript or lint errors | PASS | Build completed with no errors. |

## Security Scan (AgentShield)

- Grade: A
- Findings: 0 issues (0 critical, 0 high, 0 medium, 0 low)
- Critical findings: None
- Action taken: No action required

## Issues Found + Fixes Applied by Butters

None.

## Recommendations

1. **Kudos to Kenny** for implementing the lazy `getEnv()` singleton pattern correctly. The caching mechanism (returning the same object reference on subsequent calls) is a nice touch that avoids repeated validation overhead.

2. **Test coverage is excellent** — the new `env.test.ts` file thoroughly covers all acceptance criteria with 6 test cases covering lazy validation, correct values, missing vars, empty strings, and caching behavior.

3. **The fix is surgical and correct** — only the necessary files were modified:
   - `src/lib/env.ts`: Converted from eager to lazy validation
   - `src/lib/db.ts`: Updated to use `getEnv()` inside lazy pool initialization
   - `src/app/api/shorten/route.ts`: Updated to call `getEnv()` inside handler
   - Test files updated/created to verify the new behavior

4. **Production readiness**: This fix directly addresses the root cause identified in `production-reality-report.md` — the build will now succeed on Vercel because env vars are only accessed at runtime, not during the build phase.

## Verification Details

### Build Output
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (5/5)
✓ Finalizing page optimization
```

### Test Output
```
Test Suites: 6 passed, 6 total
Tests:       57 passed, 57 total
```

### Files Modified (vs main)
- `docs/pipeline/plan-status.md` (status tracking)
- `src/app/api/shorten/route.ts` (lazy env access)
- `src/lib/db.ts` (lazy pool initialization)
- `src/lib/env.ts` (lazy getEnv singleton)
- `tests/db.test.ts` (updated for lazy pattern)
- `tests/dedup.test.ts` (updated mocks)
- `tests/env.test.ts` (new comprehensive tests)

All modifications are within the Stage 4 scope.
