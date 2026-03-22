# User Flows: Citizen Cafe TLV Link Shortener

**Project ID:** citizen-cafe-link-shortener
**Author:** Kyle (Product Manager)
**Date:** 2026-03-22

---

## Flow 1: Create a Short Link via API (Programmatic / Automation)

**Implements:** R-001, R-002, R-003, R-004, R-007, R-008

> As an internal campaign operator, I want to POST a long URL to the shorten API so that I get back a short branded URL I can embed in automations, emails, or print materials.

### Actor

Internal campaign operator (Make/Integromat automation or direct API call)

### Preconditions

1. The `links` table migration has been run against the Neon Postgres DB
2. `DATABASE_URL` is set in the Vercel environment
3. `SHORTEN_API_KEY` is set in the Vercel environment and the caller knows the key value
4. The application is deployed and the `/api/shorten` endpoint is reachable

### Steps

| Step | User Action | System Response |
|------|-------------|-----------------|
| 1 | Caller sends `POST /api/shorten` with JSON body: `{ "url": "https://hook.integromat.com/...", "key": "<api_key>" }` and header `Content-Type: application/json` | Server receives request |
| 2 | — | Server validates that `key` matches `SHORTEN_API_KEY`; if not, returns HTTP 401 immediately |
| 3 | — | Server validates that `url` is present and begins with `http://` or `https://`; if not, returns HTTP 400 |
| 4 | — | Server checks DB for existing record with the same `original_url` (deduplication) |
| 5 | — | If no existing record: server generates an 8–12 character URL-safe shortcode via `nanoid`; inserts `{ shortcode, original_url, created_at }` into the `links` table |
| 6 | — | Server returns HTTP 201 with body: `{ "url": "https://citizen-cafe-link-shortener.vercel.app/<shortcode>" }` |

### Success Criteria

- Response status is 201 (new) or 200 (existing duplicate)
- Response body contains a `url` field with the full short URL
- Short URL resolves to the original URL when visited in a browser (verified in Flow 2)
- Record exists in the `links` table with all columns populated

### Error States

| Error | Trigger | System Behavior | Recovery |
|-------|---------|-----------------|----------|
| Wrong API key | `key` field is missing or does not match `SHORTEN_API_KEY` | HTTP 401 `{ "error": "Unauthorized" }` | Caller checks the key value and retries |
| Invalid URL | `url` is missing, empty, or not a valid HTTP/HTTPS URL | HTTP 400 `{ "error": "Invalid URL" }` | Caller corrects the `url` value and retries |
| DB unavailable | Neon Postgres unreachable or `DATABASE_URL` not set | HTTP 500 `{ "error": "Internal server error" }` | Check Vercel env vars and Neon DB status; retry |
| Short code collision (extremely rare) | Generated shortcode already exists in DB | Server regenerates a new shortcode and retries insert (max 3 attempts) | Transparent to caller; if 3 retries fail, returns HTTP 500 |

---

## Flow 2: Redirect from Short URL to Original URL

**Implements:** R-005, R-006

> As a link recipient (cafe visitor), I want clicking a short URL to take me to the intended destination quickly and invisibly.

### Actor

Link recipient (customer, end user)

### Preconditions

1. A short link has been created (Flow 1) and stored in the DB
2. The application is deployed and operational

### Steps

| Step | User Action | System Response |
|------|-------------|-----------------|
| 1 | User navigates to `https://citizen-cafe-link-shortener.vercel.app/<shortcode>` (via click, QR code scan, or manual entry) | Next.js dynamic route (or middleware) intercepts the request |
| 2 | — | Server looks up `shortcode` in the `links` table |
| 3 | — | Record found: server issues HTTP 302 redirect with `Location: <original_url>` |
| 4 | Browser follows the 302 | User lands on the original destination URL |

### Success Criteria

- User arrives at the correct destination URL within one browser navigation step
- HTTP response for the short URL path is 302 with the correct `Location` header (not 200 or 301)
- No branded UI is shown to the user in the successful redirect case (redirect is transparent)

### Error States

| Error | Trigger | System Behavior | Recovery |
|-------|---------|-----------------|----------|
| Unknown shortcode | Shortcode not found in DB | HTTP 404 branded page with Citizen Cafe logo and message: "This link doesn't exist or has been removed." | User contacts whoever shared the link |
| DB unavailable during redirect | Neon Postgres unreachable | HTTP 500 page with minimal message: "Something went wrong. Please try again." | Retry after brief wait; escalate if persistent |

---

## Flow 3: Create a Short Link via the Frontend Form (Manual)

**Implements:** R-009, R-010, R-011

> As an internal staff member without Make/Integromat access, I want to use the web UI to shorten a URL manually so that I don't need to make a raw API call.

### Actor

Internal staff member (Citizen Cafe team)

### Preconditions

1. Application is deployed and the homepage (`/`) is accessible
2. Staff member knows the `SHORTEN_API_KEY` value

### Steps

| Step | User Action | System Response |
|------|-------------|-----------------|
| 1 | Navigates to `https://citizen-cafe-link-shortener.vercel.app/` | Homepage renders with Citizen Cafe branding: logo (SVG stacked lockup), white background, charcoal text, yellow accent; form with two fields: "Long URL" and "API Key", and a "Shorten" button |
| 2 | Enters a long URL in the "Long URL" field | Field accepts input |
| 3 | Enters the API key in the "API Key" field | Field accepts input (type="password" to obscure value) |
| 4 | Clicks "Shorten" | Client-side validation runs: checks URL starts with `http://` or `https://` |
| 5a | URL is valid → | Form submits; POST request is made to `/api/shorten` from the browser |
| 5b | URL is invalid → | Inline error shown beneath the URL field: "Please enter a valid URL starting with http:// or https://"; no API call made |
| 6 | — | On 201 response: short URL is displayed below the form; a "Copy" button appears next to it |
| 7 | User clicks "Copy" | Short URL is written to clipboard; button label changes to "Copied!" for 2 seconds |

### Success Criteria

- Short URL is displayed on the page after a successful submission
- Clicking "Copy" puts the short URL on the clipboard
- The form validates URLs client-side and shows an error before submitting an invalid URL
- The page is visually on-brand: Citizen Cafe logo visible, correct colors, no default browser styling on primary elements

### Error States

| Error | Trigger | System Behavior | Recovery |
|-------|---------|-----------------|----------|
| Invalid URL (client-side) | URL field does not start with `http://` or `https://` | Inline field error shown; no API call made | User corrects the URL |
| Wrong API key (server-side) | API returns 401 | Error message displayed below the form: "Invalid API key. Please check and try again." | User enters the correct key |
| Network or server error | API returns 5xx or no response | Error message: "Something went wrong. Please try again." | User retries after a moment |
| Clipboard API unavailable | Browser blocks clipboard access | "Copy" button is hidden or shows the URL in a selectable text field | User manually selects and copies the URL |

---

## Flow 4: View 404 Branded Page for Unknown Link

**Implements:** R-006

> As a link recipient who followed an invalid or expired link, I want to see a clear, branded error page so that I understand the link is broken (not that the whole site is down).

### Actor

Link recipient (end user)

### Preconditions

1. User has a short URL that does not exist in the DB (mistyped, deleted, or never created)

### Steps

| Step | User Action | System Response |
|------|-------------|-----------------|
| 1 | User navigates to `https://citizen-cafe-link-shortener.vercel.app/<unknown_code>` | Server looks up shortcode in DB; not found |
| 2 | — | Server returns HTTP 404 with a custom branded page |
| 3 | User sees the 404 page | Page displays: Citizen Cafe logo (stacked SVG lockup), message "This link doesn't exist or has been removed.", and a return link or button |

### Success Criteria

- HTTP response status is exactly 404 (not 200, 302, or 500)
- Page shows Citizen Cafe logo and a human-readable error message
- Page does not show Next.js default 404 styling or raw error stack

### Error States

| Error | Trigger | System Behavior | Recovery |
|-------|---------|-----------------|----------|
| DB error during 404 lookup | Neon Postgres unreachable | HTTP 500 page (acceptable fallback — cannot distinguish "not found" from "DB down"); shows a generic error message | Retry; escalate if persistent |
