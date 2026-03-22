# Prior QA Summary for Stage 3
# (Compiled from Stages 1 & 2 QA reviews)

**Project:** citizen-cafe-link-shortener
**Compiled by:** Cartman (CTO)
**Date:** 2026-03-22
**Source files:** `docs/qa/stage-1-review.md`, `docs/qa/stage-2-review.md`

---

## Overall Health

Both Stage 1 and Stage 2 passed QA with **AgentShield grade A, 0 security findings**. No issues were found or fixed by the QA agent in either stage. Test coverage: 100% on Stage 1 lib modules; 95.91% lines / 100% branch+function on Stage 2 API routes. No regressions. 

---

## Conventions Established (Kenny must follow these in Stage 3)

### Environment and DB access
- `DATABASE_URL` is the **only** canonical DB env var. **Never** reference `POSTGRES_URL` or any alternate key anywhere in source files. This was tested explicitly in Stage 1 and is enforced by `src/lib/env.ts` boot-time validation.
- All env reads go through `src/lib/env.ts`. Do not scatter `process.env.*` reads in components, pages, or API routes. Import from `src/lib/env.ts` or use the exported `env` object.
- `src/lib/db.ts` exports the single `sql` / `pool` client. Import from here only — do not instantiate `@vercel/postgres` anywhere else.

### API contract (Stage 3 MUST follow this)
- `POST /api/shorten` returns `{ "url": "<APP_BASE_URL>/<shortcode>" }` — a wrapped object with a `url` key.
- HTTP 201 = new record; HTTP 200 = existing dedup match. Both are success.
- All 4xx/5xx errors return `{ "error": "<message>" }`.
- `ShortenForm` (Stage 3) uses `postShorten(url, key)` from `src/lib/api/shorten.ts` — **never** an inline `fetch()`. The wrapper handles the `{ url }` parsing. The component reads `response.url`.
- **NEVER** embed `NEXT_PUBLIC_SHORTEN_API_KEY` anywhere — it would expose the key in the JS bundle. The key is sent in the POST body only.

### Security conventions
- No hardcoded secrets, no debug console.log of sensitive values.
- `type="password"` on the API key input field (Stage 3 plan requirement).
- AgentShield grade A standard expected to be maintained.

### Testing conventions
- Stage 3 test strategy is **pragmatic** — presentational UI; only client-side validation logic requires automated unit tests. Visual/interaction acceptance criteria are verified manually.
- Automated tests should cover: URL format validation (must start with `http://` or `https://`) before any API call.
- Do not add tests for pure rendering/CSS (not expected, would add noise).

---

## Recurring Butters QA Feedback (positive patterns to preserve)

1. **Strict arch separation is praised**: keeping `db.ts`, `env.ts`, and `schemas.ts` as thin focused modules was explicitly called out as excellent. Stage 3 components must not merge concerns — `BrandHeader`, `ShortenForm`, `NotFoundPage` should be separate files.
2. **Mocked DB for unit tests**: the dedup.test.ts approach (mock DB, test logic) was praised. If Stage 3 adds any server-side logic, follow the same pattern.
3. **Auth note in route.ts**: documenting key decisions as code comments was praised. Add similar comments where Stage 3 makes deliberate choices (e.g., why `type="password"`, why no `NEXT_PUBLIC_*`).

---

## Known CI Warning (not a blocking issue)

Tailwind reported "no utility classes detected in source files" during Stage 1 and Stage 2 builds. This is expected — Stage 3 introduces the first UI components with Tailwind classes. This warning **must disappear** after Stage 3; if it persists, `tailwind.config.ts` content paths are wrong and must be corrected.

---

## Infra Note (not a code issue)

GitHub Actions `test-and-build` CI fails on PRs because `DATABASE_URL`, `SHORTEN_API_KEY`, and `APP_BASE_URL` are not set as GitHub Actions secrets. This is a known infra gap documented in the Stage 1 plan and README. Kenny must note this in the Stage 3 PR description and flag it to the user for resolution. It does not block QA or merge decisions since tests run with mocked DB.
