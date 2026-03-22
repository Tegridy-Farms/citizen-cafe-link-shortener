# Production Reality Report: citizen-cafe-link-shortener
**Date:** 2026-03-22
**Deployed URL:** https://citizen-cafe-link-shortener.vercel.app
**Verdict:** BLOCKED

## Deployment readiness
| Field | Value |
|-------|-------|
| Polling enabled | yes |
| Deployment ID | dpl_EuYcTsqt7F3uwALhzxLrxEjUeAHY |
| Final state | ERROR |
| Error (if any) | Latest production deployment is in ERROR state. Site may be serving a stale cached deployment. |

## Env preflight
| Key | Required Targets | Present Targets | Status |
|-----|------------------|-----------------|--------|
| DATABASE_URL | production, preview, development | production, preview, development | PASS |
| SHORTEN_API_KEY | production, preview, development | — | **FAIL — MISSING** |
| APP_BASE_URL | production, preview, development | — | **FAIL — MISSING** |

## Route Smoke Test
| Route | Expected | Actual | Notes |
|-------|----------|--------|-------|
| `/` | 200 | 200 | Stale cached deployment serving page with title "Citizen Cafe TLV — Link Shortener". Contains `next-error-h1` class suggesting error state. |
| `POST /api/shorten` | 201/200 | 404 | **FAIL** — API route does not exist in production. Returns HTML 404 page. |
| `/INVALIDCODE` | 404 | 404 | Returns 404 as expected, but cannot verify branded 404 page since deployment is in error state. |

## API probe
| Path | Expected | Actual | Notes |
|------|----------|--------|-------|
| POST /api/shorten | 201 + `{ url: "..." }` | 404 (HTML) | **FAIL** — API route not found. Likely caused by deployment ERROR state + missing env vars preventing successful build. |

## Issues

1. **CRITICAL — Missing SHORTEN_API_KEY env var in Vercel:** Required by `src/lib/env.ts` at boot time. Without it, the app cannot start. Must be set for production, preview, and development targets.
2. **CRITICAL — Missing APP_BASE_URL env var in Vercel:** Required by `src/lib/env.ts` at boot time. Without it, the app cannot start. Must be set to `https://citizen-cafe-link-shortener.vercel.app` for production, preview, and development targets.
3. **CRITICAL — Latest production deployment in ERROR state:** Deployment `dpl_EuYcTsqt7F3uwALhzxLrxEjUeAHY` has state `ERROR`. The missing env vars likely caused the build/boot to fail. A new deployment must be triggered after adding the missing env vars.
4. **BLOCKED — POST /api/shorten returns 404:** The core API endpoint is unreachable in production. This means the primary functionality (link shortening) is completely non-functional.

## Handoff
- BLOCKED: Cartman (fix required) — Add missing Vercel env vars (SHORTEN_API_KEY, APP_BASE_URL), then trigger a new production deployment.
