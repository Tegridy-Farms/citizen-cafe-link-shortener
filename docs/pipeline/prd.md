# PRD: Citizen Cafe TLV Link Shortener

**Project ID:** citizen-cafe-link-shortener
**Author:** Kyle (Product Manager)
**Date:** 2026-03-22

---

## Problem Statement

Citizen Cafe TLV needs to distribute tracking URLs (e.g. Integromat/Make webhook URLs with campaign parameters) that are extremely long, visually unappealing, and impractical to share via print, signage, or SMS. Long URLs expose implementation details (webhook platform, campaign IDs), are error-prone when typed, and cannot be branded. No off-the-shelf shortener (Bitly, TinyURL) offers a self-hosted, API-driven solution with Citizen Cafe branding on the landing experience — and every third-party service introduces a dependency and potential privacy risk for campaign data. The cost of not solving this: campaign links that look unprofessional, break in certain media, or leak internal tracking structure.

---

## Target Users

**Persona 1 — Internal campaign operator (primary)**
- **Characteristic:** Marketing or ops team member at Citizen Cafe who triggers link creation programmatically (via Make/Integromat automation or direct API call)
- **Primary goal:** Generate a short, branded URL for a campaign link in under 5 seconds without touching a UI
- **Pain point:** No current way to shorten URLs internally; must use third-party tools that expose webhook URLs and offer no brand control

**Persona 2 — Link recipient / cafe visitor (secondary)**
- **Characteristic:** Customer who receives or scans a short link (via print, social, SMS, or QR code)
- **Primary goal:** Reach the destination URL quickly and reliably
- **Pain point:** Long raw webhook URLs are untrustworthy and unscannable in physical media

---

## Product Overview

The Citizen Cafe TLV Link Shortener is a self-hosted web application deployed on Vercel. It exposes a protected API endpoint (`POST /api/shorten`) that accepts a long URL and a secret key, stores the mapping in a Neon Postgres database, and returns a branded short URL (`https://citizen-cafe-link-shortener.vercel.app/<shortcode>`). When a visitor hits the short URL, the app performs a server-side redirect (HTTP 302) to the original URL. A minimal single-page frontend displays the Citizen Cafe brand and can be used for manual link creation by internal staff.

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Short URL creation latency (API) | `POST /api/shorten` returns HTTP 201 in < 500ms (p95) under normal load | Manual timing test with 10 sequential API calls |
| Redirect latency | `GET /<shortcode>` redirects in < 300ms (p95) for valid codes | Manual timing test with 10 sequential requests |
| API authentication rejection | Requests with wrong/missing `key` return HTTP 401 in 100% of cases | 5 test calls with invalid keys; all must be rejected |
| Short code uniqueness | Zero collisions across 1,000 consecutive link creation calls | Load test: 1,000 POST calls; verify distinct shortcodes in DB |
| Invalid short code handling | `GET /<unknown_shortcode>` returns HTTP 404 (not a crash or blank page) | Manual test with 3 made-up shortcodes |

---

## Tech Constraints

**Pre-provisioned infrastructure (always present, do not re-provision):**
- Hosting: Vercel — project `prj_Id7TZT0u8pEHY7hRKcztSyXqhPMa`, URL `https://citizen-cafe-link-shortener.vercel.app`
- Database: Neon Postgres — project `frosty-forest-25973789`; canonical env var is **`DATABASE_URL`** (never `POSTGRES_URL` or any alternate key)
- Repo: `tegridy-farms/citizen-cafe-link-shortener` on GitHub, CI/CD active from first push

**Required stack decisions for this project:**
- Frontend framework: Next.js 14 (App Router)
- Styling: Tailwind CSS
- Auth: None (no user login — API key auth only on the shorten endpoint, via `Authorization` header or `key` field in request body per idea spec)
- Key libraries/dependencies: `nanoid` for short code generation; `pg` or `@vercel/postgres` for DB access (no ORM); no other external runtime dependencies required

**Hard constraints:**
- Never hardcode credentials or secrets — always use environment variables
- `DATABASE_URL` is the only canonical DB connection env var; no alternate keys
- `SHORTEN_API_KEY` is the env var for the API key used to authenticate `POST /api/shorten`; must never be exposed to the client bundle (no `NEXT_PUBLIC_` prefix)
- No external services beyond what's listed here unless explicitly approved
- Database migrations must be runnable via `DATABASE_URL` env var

---

## Requirements

| ID    | Priority | Description | Acceptance Criterion (binary pass/fail) |
|-------|----------|-------------|------------------------------------------|
| R-001 | P0 | `POST /api/shorten` accepts JSON body `{ "url": "<long_url>", "key": "<api_key>" }` and returns HTTP 201 with JSON body `{ "url": "https://citizen-cafe-link-shortener.vercel.app/<shortcode>" }` | POST with valid URL and correct key returns 201 with a `url` field matching the expected format; shortcode is present in DB |
| R-002 | P0 | `POST /api/shorten` rejects requests with missing or incorrect `key` with HTTP 401 | POST with wrong key returns 401; POST with missing key returns 401; neither creates a DB record |
| R-003 | P0 | `POST /api/shorten` rejects requests where `url` is missing or not a valid HTTP/HTTPS URL with HTTP 400 | POST with empty `url` returns 400; POST with `url = "not-a-url"` returns 400; no DB record is created in either case |
| R-004 | P0 | Short codes are 8–12 URL-safe alphanumeric characters, generated uniquely per request using `nanoid` | 1,000 calls produce 1,000 distinct shortcodes in DB; all shortcodes match regex `^[A-Za-z0-9_-]{8,12}$` |
| R-005 | P0 | `GET /<shortcode>` performs an HTTP 302 redirect to the original URL stored for that shortcode | Browser/curl request to a valid short URL receives a 302 response with `Location` header pointing to the original URL |
| R-006 | P0 | `GET /<shortcode>` for an unknown shortcode returns HTTP 404 with a branded "not found" page (Citizen Cafe branding, not a Next.js default error page) | Request to `/INVALIDCODE` returns HTTP 404; page displays Citizen Cafe logo and a human-readable error message |
| R-007 | P0 | URL mappings are persisted in Neon Postgres in a `links` table with columns: `id` (serial PK), `shortcode` (text, unique), `original_url` (text), `created_at` (timestamptz default now()) | After a successful POST, the record exists in the `links` table with all four columns populated |
| R-008 | P0 | Database migration SQL is committed to the repo and runnable via `psql $DATABASE_URL -f <migration_file>` | Running the migration on a fresh Neon DB creates the `links` table with the correct schema; running it twice does not error (idempotent via `CREATE TABLE IF NOT EXISTS`) |
| R-009 | P1 | The homepage (`/`) displays a minimal single-page form where internal staff can manually shorten a URL by entering the long URL and the API key; on success it shows the resulting short URL with a one-click copy button | Submitting a valid URL + correct key from the homepage form results in the short URL being displayed and copyable; the short URL resolves correctly |
| R-010 | P1 | The homepage and the 404 page apply full Citizen Cafe branding: background white (`#FFFFFF`), primary accent yellow (`#FFE300`), text charcoal (`#373230`); Citizen Cafe logo (stacked English + TEL-AVIV lockup) rendered using the provided SVG asset; Assistant font for all UI text via Google Fonts | Visual inspection: logo is present and not distorted; color tokens match the spec; no non-brand colors appear in primary surfaces |
| R-011 | P1 | The frontend form validates the URL client-side before submitting (must start with `http://` or `https://`) and shows an inline error if invalid | Entering `"not-a-url"` in the form and clicking submit shows an error message in the UI without making an API call |
| R-012 | P2 | If the same `original_url` is submitted again, the API returns the existing shortcode (deduplication) rather than creating a duplicate record | Two POST calls with the identical `url` return the same short URL; only one record exists in DB for that original URL |

---

## Non-Goals (MVP Scope Boundary)

1. **No analytics or click tracking** — the redirect route does not count clicks, log referrers, or expose any stats endpoint; analytics are entirely out of scope
2. **No admin dashboard or link management UI** — there is no interface to list, edit, or delete existing links; the database is the source of truth
3. **No custom shortcodes** — callers cannot specify their preferred shortcode; the system always generates one with `nanoid`
4. **No rate limiting on the API** — abuse protection is solely the secret key; rate limiting is a post-MVP concern
5. **No expiry / TTL on links** — all links are permanent; no scheduled cleanup
6. **No QR code generation** — out of scope; callers can wrap the short URL in a QR generator themselves

---

## Implementation Notes

- **Schema first:** The `links` table DDL and migration file must be committed and runnable before any route logic is written. All redirect and shorten logic depends on this schema.
- **API key handling:** The `key` field is accepted in the JSON request body (per the idea spec contract). The server compares it against `process.env.SHORTEN_API_KEY` — never expose this via `NEXT_PUBLIC_`. The frontend form also accepts a key field; the key is sent server-side only (via Next.js Route Handler or API route, never exposed in client bundle).
- **Redirect route pattern:** In Next.js App Router, `GET /<shortcode>` should be handled by a dynamic route `app/[shortcode]/page.tsx` with `redirect()` server-side, or via Next.js middleware for lower latency. If using middleware, ensure it does not intercept `/api/*` or Next.js internals.
- **Branding assets:** The provided SVG logo file is at `/home/openclaw/.openclaw/media/inbound/af353912-4c8e-43fc-97ae-5c98f0b9519f` (SVG) and `/home/openclaw/.openclaw/media/inbound/e9387038-105f-403d-854c-8aad17fe63f5.png` (PNG). The SVG contains the full Citizen Cafe wordmark with TEL-AVIV. Wendy (Design) should copy these into `public/logo.svg` and `public/logo.png`. The SVG uses `#ffe300` fill (canonical yellow) and a `stroke: #000` outline — do not alter these values. Font for UI: Assistant (available via Google Fonts — `@import` or `next/font/google`). Fedra is a licensed font; if unavailable, use the logo SVG asset rather than attempting to typeset the wordmark.
- **Deduplication (R-012):** We chose upsert-on-duplicate over always-insert because creating multiple shortcodes for the same URL pollutes the DB. Trade-off: callers cannot get a fresh shortcode for an existing URL without manual DB intervention.
- Per **L1 / L10 / L11** (LEARNINGS.md): `DATABASE_URL` must be wired into Vercel env vars and the Neon DB must have migrations run **before** any QA stage. This is a CRITICAL setup dependency. All application code must reference only `DATABASE_URL` — no `POSTGRES_URL` or other alternate keys.

---

## Boundaries

- Never commit `.env` files or hardcoded secrets to the repo
- Never expose `SHORTEN_API_KEY` in the client bundle (`NEXT_PUBLIC_` prefix is forbidden for this var)
- Never modify the GitHub Actions / CI config unless explicitly required by a requirement
- Never add npm dependencies not relevant to the requirements without noting it
- Do not implement analytics, link management, or any feature not listed in Requirements
- Do not alter the Citizen Cafe logo SVG geometry, colors, or proportions

---

## Open Questions

1. Should the `key` field be accepted in the request body (as specified in idea.md) or as an `Authorization: Bearer <key>` header? Current assumption: request body field `key`, matching the idea spec. If Make/Integromat sends it as a header, the implementation needs to check both locations.
2. What is the desired behavior when `POST /api/shorten` is called with a URL that already exists in the DB and deduplication (R-012) is implemented — should the response be HTTP 200 (existing) or HTTP 201 (created)? Current assumption: HTTP 200 for existing, 201 for new.
3. Is the Vercel domain `citizen-cafe-link-shortener.vercel.app` the final production domain, or will a custom domain (e.g. `go.citizencafe.co.il`) be configured before launch? This affects the base URL returned by `POST /api/shorten`. If a custom domain is used, `APP_BASE_URL` should be a separate env var rather than hard-coding the Vercel domain.
