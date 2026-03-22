# Plan Status: Citizen Cafe TLV Link Shortener

**Project ID:** citizen-cafe-link-shortener
**Plan:** `docs/pipeline/plan.md`
**Last updated:** 2026-03-22

**Current Stage: 6**
**Total Stages: 6**

---

## Summary Table

| Stage | Title | Status | Branch | Notes |
|-------|-------|--------|--------|-------|
| 1 | Scaffold, Migrations, and Core Library | DONE | stage-1-scaffold-migrations-core | PR #1 merged. 19 tests, 100% lib coverage, grade A. |
| 2 | API Route — Shorten + Redirect | DONE | stage-2-api-route-shorten-redirect | PR #2 merged. 48 tests, 95.91% line coverage. QA PASS. |
| 3 | Frontend UI — Branding, Homepage Form, and 404 Page | DONE | stage-3-frontend-ui-branding | PR #3 merged. 55 tests, 96.07% line coverage. QA PASS. |
| 4 | Production Fix — Lazy Env Validation | DONE | stage-4-lazy-env-validation | PR #4 merged. 57 tests, build passes. Lazy getEnv() singleton implemented. |
| 5 | Production Fix — Shortcode Route 500 on Not-Found | QA_DONE | stage-5-fix-shortcode-404 | PR #5: https://github.com/Tegridy-Farms/citizen-cafe-link-shortener/pull/5. 63 tests (was 57), 96.96% coverage. Build passes. Fixed db.ts to use direct sql import from @vercel/postgres. QA report: docs/qa/stage-5-review.md |
| 6 | Production Fix — db.ts Direct sql Import Not Merged | QA_DONE | stage-5-fix-shortcode-404 | Supersedes Stage 5. Simplified db.ts to minimal direct re-export pattern. 63 tests pass. Build succeeds. AgentShield grade A. |

---

## Stage 1: Scaffold, Migrations, and Core Library

**Objective:** Bootstrap the Next.js project with all config, run the `links` DB migration, and wire up the shared `db.ts`, `env.ts`, and `schemas.ts` modules.

**Status:** DONE

### Development notes

| Date       | Note |
|------------|------|
| 2026-03-22 | Stage created; awaiting Kenny handoff |
| 2026-03-22 | Implemented. PR #1: https://github.com/Tegridy-Farms/citizen-cafe-link-shortener/pull/1. 19 tests, 100% line coverage. Migration run on Neon, schema verified. Build passes. |

### QA notes

| Date       | Note |
|------------|------|
| 2026-03-22 | Butters: Verified Stage 1 implementation against plan. All 7 acceptance criteria pass. 19 tests with 100% line coverage on src/lib/* files. Build clean. AgentShield grade A with 0 findings. No POSTGRES_URL references in source. Migration is idempotent (CREATE TABLE IF NOT EXISTS). QA report: docs/qa/stage-1-review.md |
| 2026-03-22 | Butters QA verdict: PASS |

### Merge notes

| Date       | Note |
|------------|------|
| 2026-03-22 | Cartman: PR #1 merged (squash) to main. Stage 1 DONE. Stage 2 tasks created; Kenny handed off. |

---

## Stage 2: API Route — Shorten + Redirect

**Objective:** Implement `POST /api/shorten` (key auth, URL validation, deduplication, insert) and the `GET /[shortcode]` RSC redirect route (302 → original URL or branded 404).

**Status:** DONE

### Development notes

| Date       | Note |
|------------|------|
| 2026-03-22 | Stage created; Kenny handed off via sessions_send |
| 2026-03-22 | Implemented. PR #2: https://github.com/Tegridy-Farms/citizen-cafe-link-shortener/pull/2. 48 tests, 95.91% line coverage (100% branch/func). Build passes. All 9 ACs verified. |

### QA notes

| Date       | Note |
|------------|------|
| 2026-03-22 | Butters: Verified Stage 2 implementation against plan. All 9 acceptance criteria pass. 48 tests with 95.91% line coverage, 100% branch/function coverage. Build clean. AgentShield grade A with 0 findings. No POSTGRES_URL references. QA report: docs/qa/stage-2-review.md |
| 2026-03-22 | Butters QA verdict: PASS |

### Merge notes

| Date       | Note |
|------------|------|
| 2026-03-22 | Cartman: PR #2 merged (squash) to main. Stage 2 DONE. Stage 3 tasks created; Kenny handed off. |

---

## Stage 3: Frontend UI — Branding, Homepage Form, and 404 Page

**Objective:** Build the complete Citizen Cafe–branded homepage and styled 404 page.

**Status:** DONE

### Development notes

| Date       | Note |
|------------|------|
| 2026-03-22 | Stage created; Kenny handed off via sessions_send |
| 2026-03-22 | Implemented. PR #3: https://github.com/Tegridy-Farms/citizen-cafe-link-shortener/pull/3. 55 tests, 96.07% line coverage / 100% branch+function. Build passes. All 10 ACs verified. |

### QA notes

| Date       | Note |
|------------|------|
| 2026-03-22 | Butters: Verified Stage 3 implementation against plan and design bible. All 10 acceptance criteria pass. 55 tests with 96.07% line coverage, 100% branch/function coverage. Build clean. AgentShield grade A with 0 findings. Design QA PASS — follows brand colors, typography, spacing, accessibility requirements. No anti-patterns. QA report: docs/qa/stage-3-review.md |
| 2026-03-22 | Butters QA verdict: PASS |

### Merge notes

| Date       | Note |
|------------|------|
| 2026-03-22 | Cartman: PR #3 merged (squash) to main. Stage 3 DONE. All stages complete — PIPELINE COMPLETE (pre-production). |

---

## Stage 4: Production Fix — Lazy Env Validation

**Objective:** Fix `src/lib/env.ts` to use lazy validation so `next build` does not throw during page data collection.

**Status:** DONE

### Development notes

| Date       | Note |
|------------|------|
| 2026-03-22 | Production fix triggered by Tweek: PRODUCTION_VERIFICATION_FAILED. Root cause: env.ts throws eagerly at module scope; Vercel runtime env vars not available at build time. Fix: convert to lazy getEnv() singleton. Stage 4 tasks created; Kenny handed off. |
| 2026-03-22 | Implemented. PR #4: https://github.com/Tegridy-Farms/citizen-cafe-link-shortener/pull/4. 57 tests (was 55), build passes. All 8 acceptance criteria verified. Lazy getEnv() singleton validates on first call, not at import time. |

### QA notes

| Date       | Note |
|------------|------|
| 2026-03-22 | Butters: Verified Stage 4 implementation. All 8 acceptance criteria pass. 57 tests, build passes. getEnv() lazy singleton implemented. QA report: docs/qa/stage-4-review.md |
| 2026-03-22 | Butters QA verdict: PASS |

### Merge notes

| Date       | Note |
|------------|------|
| 2026-03-22 | Cartman: PR #4 merged (squash) to main. Stage 4 DONE. All 4 stages complete — PIPELINE COMPLETE. |

---

## Stage 5: Production Fix — Shortcode Route 500 on Not-Found

**Objective:** Fix `src/app/[shortcode]/page.tsx` and `src/lib/db.ts` so `GET /[shortcode]` returns HTTP 404 (not 500) for non-existent shortcodes.

**Status:** QA_DONE

### Development notes

| Date       | Note |
|------------|------|
| 2026-03-22 | Production fix triggered by Tweek: PRODUCTION_VERIFICATION_FAILED. Deployment READY, env vars PASS, API routes PASS. Root cause: GET /[shortcode] returns HTTP 500 instead of 404 for all missing shortcodes. Two likely failure modes: (1) db.ts uses (pool as any).sql which may throw at runtime on Vercel Node.js runtime vs build environment; (2) any try/catch around the sql call swallows the notFound() throw before Next.js can handle it. Fix: replace (pool as any).sql with direct sql import from @vercel/postgres; ensure notFound() propagates unimpeded. Stage 5 tasks created; Kenny handed off. |
| 2026-03-22 | Implemented. PR #5: https://github.com/Tegridy-Farms/citizen-cafe-link-shortener/pull/5. 63 tests (was 57), 96.96% coverage. Build passes. Fixed db.ts to use direct `sql` import from `@vercel/postgres` instead of unsafe `(pool as any).sql.bind(pool)` pattern. All 8 acceptance criteria verified. |

### QA notes

| Date       | Note |
|------------|------|
| 2026-03-22 | Butters: Verified Stage 5 implementation against plan. All 8 acceptance criteria pass. 63 tests with 96.42% line coverage, 100% branch/function coverage. Build clean. AgentShield grade A with 0 findings. db.ts uses direct `import { sql } from '@vercel/postgres'` pattern. No try/catch in page.tsx that could swallow notFound(). QA report: docs/qa/stage-5-review.md |
| 2026-03-22 | Butters QA verdict: PASS |

### Merge notes

| Date       | Note |
|------------|------|
| 2026-03-22 | Pending: Cartman to merge PR #5 to main and hand off to Tweek for production smoke testing. |

---

## Stage 6: Production Fix — db.ts Direct sql Import Not Merged

**Objective:** Replace `(pool as any).sql.bind(pool)` in `src/lib/db.ts` on `main` with the direct `sql` tagged-template re-export from `@vercel/postgres`, and verify production smoke passes.

**Status:** QA_DONE

### Development notes

| Date       | Note |
|------------|------|
| 2026-03-22 | Production fix triggered by second PRODUCTION_VERIFICATION_FAILED from Tweek. Root cause: Stage 5's correct fix (direct sql import) was implemented on branch stage-5-fix-shortcode-404 but PR #5 was never merged to main. main still has createPool+(pool as any).sql. Fix: supersede Stage 5 branch with Stage 6 branch; implement minimal db.ts (import { sql } from '@vercel/postgres'; export { sql }); merge to main so Vercel deploys the correct code. Stage 6 tasks created; Kenny handed off. |
| 2026-03-22 | Implemented on stage-5-fix-shortcode-404 branch (superseding Stage 5). Simplified db.ts to minimal direct re-export pattern. 63 tests pass. Build succeeds. |

### QA notes

| Date       | Note |
|------------|------|
| 2026-03-22 | Butters: Verified Stage 6 implementation. Simplified db.ts to exact pattern specified in acceptance criteria: `import { sql } from '@vercel/postgres'; export { sql };`. Removed unnecessary wrapper functions. All 63 tests pass. Build succeeds with no TypeScript or lint errors. AgentShield grade A with 0 findings. QA report: docs/qa/stage-6-review.md |
| 2026-03-22 | Butters QA verdict: PASS_WITH_FIXES |

### Merge notes

| Date       | Note |
|------------|------|
| 2026-03-22 | Pending: Cartman to merge to main and hand off to Tweek for production smoke testing. |
