# Production Reality Report: citizen-cafe-link-shortener
**Date:** 2026-03-22
**Deployed URL:** https://citizen-cafe-link-shortener.vercel.app
**Verdict:** BLOCKED
**Classification:** code_fix_required

## Deployment readiness
| Field | Value |
|-------|-------|
| Polling enabled | yes |
| Deployment ID | dpl_3d8Ldfc18XzAnrPdcg9NExxeBNhR |
| Final state | ERROR |
| Error | BUILD_UTILS_SPAWN_1 — Command "npm run build" exited with 1 |

**All 5 recent deployments are in ERROR state.** The build has never succeeded.

## Env preflight
| Key | Required Targets | Present Targets | Status |
|-----|------------------|-----------------|--------|
| DATABASE_URL | production, preview, development | development, preview, production | PASS |
| SHORTEN_API_KEY | production, preview, development | development, preview, production | PASS |
| APP_BASE_URL | production, preview, development | development, preview, production | PASS |

**All required env vars are correctly configured in Vercel.** This is NOT an env/infra issue.

## Route Smoke Test
| Route | Expected | Actual | Notes |
|-------|----------|--------|-------|
| / | 200 | N/A | Build failed — no deployment available to test |
| /api/shorten | 200 (POST) | N/A | Build failed — no deployment available to test |
| /INVALIDCODE | 404 | N/A | Build failed — no deployment available to test |

## API probe
| Path | Expected | Actual | Notes |
|------|----------|--------|-------|
| POST /api/shorten | 201 + JSON | N/A | Build failed — no deployment available |

## Issues

### 1. Build failure: `env.ts` throws at build time during page data collection

**Evidence (from Vercel build logs, deployment dpl_3d8Ldfc18XzAnrPdcg9NExxeBNhR):**

```
Collecting page data ...
Error: Missing required environment variable: SHORTEN_API_KEY. Set it in .env.local (development) or as a Vercel/GitHub Actions secret (CI/production).
    at 7848 (/vercel/path0/.next/server/app/api/shorten/route.js:19:15851)
> Build error occurred
Error: Failed to collect page data for /api/shorten
```

**Root cause:** `src/lib/env.ts` validates required env vars **eagerly at module-load time** (top-level throw). When Next.js runs `next build`, it collects page data for `/api/shorten`, which imports `env.ts` → which imports and evaluates the env check → which throws because Vercel runtime env vars (like `SHORTEN_API_KEY`) are **not available during the build phase** — they're only injected at runtime.

The build compiled successfully (✓ Compiled successfully) and passed type checking, but failed at the "Collecting page data" phase when it tried to pre-render/analyze the API route.

**Required fix (one of):**
1. **Lazy validation:** Change `env.ts` from eagerly throwing at module scope to exporting a function (e.g. `getEnv()`) that validates on first call. Route handlers call `getEnv()` at request time, not at import time.
2. **Add `export const dynamic = 'force-dynamic'`** to `app/api/shorten/route.ts` to prevent Next.js from trying to pre-render/collect data for this route at build time.
3. **Guard the throw:** Wrap the env check in `env.ts` with a condition that skips validation during build (e.g. check `process.env.NEXT_PHASE === 'phase-production-build'`).

Option 1 (lazy validation) is the cleanest and most robust approach.

## Handoff
- **BLOCKED + code_fix_required → Cartman**
- `src/lib/env.ts` eagerly throws at build time, crashing `next build`. Env vars ARE set in Vercel — this is a code architecture issue, not infra/env.
