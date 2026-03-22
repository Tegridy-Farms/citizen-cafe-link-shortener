# Production Reality Report: citizen-cafe-link-shortener
**Date:** 2026-03-22
**Deployed URL:** https://citizen-cafe-link-shortener.vercel.app
**Verdict:** BLOCKED

## Deployment readiness
| Field | Value |
|-------|-------|
| Polling enabled | yes |
| Deployment ID | dpl_Gfds3KRa7VgQgKujUnhF7xqaLjPr |
| Final state | READY |
| Error (if any) | None — build succeeded |

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
| POST /api/shorten (wrong key) | 401 | 401 | PASS — returns `{"error":"Unauthorized"}` |
| POST /api/shorten (empty body) | 400 | 400 | PASS — returns `{"error":"Invalid URL"}` |

## Issues
1. **[/[shortcode]] — HTTP 500 instead of 404 for nonexistent shortcodes** — Every request to `GET /<shortcode>` where the shortcode does not exist in the DB returns HTTP 500 instead of the expected 404. The RSC response payload contains the branded not-found content (Citizen Cafe logo, "Link Not Found" heading) but the HTTP status is 500, not 404. The RSC payload includes an error digest `5:E{"digest":"4231695441"}`, indicating a server-side runtime error is being thrown. This means the `notFound()` call in `app/[shortcode]/page.tsx` is either not being reached (SQL query throws first) or its effect is being overridden by an unhandled error. Possible root causes:
   - The `sql` tagged template in `src/lib/db.ts` uses `(pool as any).sql.bind(pool)` — the `.sql` property on `createPool()` may not exist or may not behave as a tagged template when bound. The API route (`route.ts`) may use a different code path or different import that works.
   - The `notFound()` function from `next/navigation` is being thrown as expected, but an upstream error boundary catches it as a generic error before the Next.js 404 handler processes it.
   - The response body shows the 404 UI content is rendered, but the status code is wrong — suggesting the error boundary renders the not-found template but sets status 500.

2. **Redirect flow (GET /[valid-shortcode] → 302) untestable** — Cannot verify the redirect flow (user-flows Flow 2) because creating a test link requires the `SHORTEN_API_KEY` value, which is encrypted in Vercel. However, the underlying issue is moot: if the `[shortcode]/page.tsx` RSC throws a 500 for nonexistent codes, it likely also fails for existing codes (same code path through `sql` before the conditional branch).

## Classification
**BLOCKED — code_fix_required**

Env contract is complete (all 3 vars present with correct targets), deployment is READY, API routes work correctly. The bug is in the `app/[shortcode]/page.tsx` server component — the `sql` tagged template call or the `notFound()` handling produces an unhandled runtime error instead of a clean 404 response.

## Handoff
- BLOCKED + code_fix_required: Cartman (fix required in `app/[shortcode]/page.tsx` and/or `src/lib/db.ts`)
