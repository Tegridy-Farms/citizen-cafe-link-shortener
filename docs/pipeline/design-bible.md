# Design Bible: Citizen Cafe TLV Link Shortener

**Project ID:** citizen-cafe-link-shortener
**Author:** Wendy (UX Designer)
**Date:** 2026-03-22

---

## Design Principles

1. **Brand first, chrome last** — The Citizen Cafe identity (yellow #FFE300, charcoal #373230, SVG logo lockup) is the dominant visual element on every page. UI chrome (inputs, buttons, labels) is subordinate and serves the brand rather than competing with it. (Supports R-010; traced from PRD branding spec and target persona: Citizen Cafe visitor receiving a short link.)

2. **One action, one page** — The entire homepage exists to do one thing: shorten a URL. There is no navigation, no sidebar, no secondary content. Every pixel that doesn't support that action is removed. (Supports R-009; traced from PRD success metric: link creation in < 5 seconds for internal staff, Flow 3.)

3. **Fail loudly, visibly, and locally** — Errors are shown inline at the exact field or action that caused them, not in a generic banner. Validation runs client-side before any API call so the user never waits for a network round-trip to learn they made a typo. (Supports R-011, R-002, R-003; traced from Flow 3 error states.)

4. **Transparency for the redirected visitor** — A visitor who follows a broken link deserves a clear, branded explanation — not a blank screen or a raw Next.js error page. The 404 experience must feel intentional and on-brand, not like a system failure. (Supports R-006; traced from Flow 4.)

5. **Zero UI for the API path** — The programmatic shortening workflow (Flow 1) has no UI at all. Design effort is focused only on the two pages a human sees: the homepage form and the 404 page. The redirect (Flow 2) is invisible by design. (Supports R-001 through R-008; traced from PRD non-goal: no admin dashboard.)

---

## Color Palette

All brand color values are specified directly in the PRD (R-010) and appear in the SVG logo asset. Do not deviate from these hex values on any primary surface.

| Name            | Hex       | Usage                                                              | Contrast Ratio (on #FFFFFF) |
|-----------------|-----------|--------------------------------------------------------------------|-----------------------------|
| Brand Yellow    | #FFE300   | Primary accent: button background, focus ring, active highlights   | 1.07:1 — use on #373230 bg  |
| Brand Charcoal  | #373230   | Primary text, button label on yellow, headings, body copy          | 12.6:1 on #FFFFFF (AAA ✓)   |
| Background      | #FFFFFF   | Page background — all surfaces                                     | N/A                         |
| Surface Card    | #FAFAFA   | Subtle card/form panel background (1 step off white)               | N/A                         |
| Border          | #E4E1DC   | Input borders, dividers — warm gray aligned to brand charcoal      | N/A                         |
| Text Primary    | #373230   | All body text, labels, placeholders                                | 12.6:1 on #FFFFFF (AAA ✓)   |
| Text Muted      | #7A756F   | Sub-labels, hints, placeholder text                                | 4.6:1 on #FFFFFF (AA ✓)     |
| Error           | #B91C1C   | Inline field errors, API error messages                            | 6.5:1 on #FFFFFF (AA ✓)     |
| Success         | #065F46   | Success confirmation message for generated short URL               | 8.4:1 on #FFFFFF (AA ✓)     |
| Focus Ring      | #FFE300   | Keyboard focus outline — 3px ring on #373230 background           | N/A — sufficient for brand  |

**Critical:** Brand Yellow (#FFE300) has a 1.07:1 contrast ratio on white — it MUST NOT be used as a background behind yellow text, nor for text on white. It is only valid as a background when paired with Brand Charcoal (#373230) text (12.6:1 pass). All text on yellow elements must use #373230.

**Assumption:** No secondary accent colors exist in the brief. Text Muted (#7A756F) is derived from Brand Charcoal with reduced saturation — it is not a brand-specified color but is required for accessible placeholder text.

---

## Typography

The PRD specifies the **Assistant** font (Google Fonts) for all UI text (R-010). The Citizen Cafe wordmark within the SVG logo asset uses the brand typeface; it must not be reproduced via web font — use the logo SVG exclusively for wordmark rendering.

Load via `next/font/google`: `{ family: 'Assistant', subsets: ['latin'], weight: ['400', '500', '600', '700'] }`.

| Element   | Font Family                       | Size   | Weight | Line Height |
|-----------|-----------------------------------|--------|--------|-------------|
| H1        | Assistant, system-ui, sans-serif  | 28px   | 700    | 1.25        |
| H2        | Assistant, system-ui, sans-serif  | 22px   | 600    | 1.30        |
| H3        | Assistant, system-ui, sans-serif  | 18px   | 600    | 1.35        |
| H4        | Assistant, system-ui, sans-serif  | 16px   | 600    | 1.40        |
| H5        | Assistant, system-ui, sans-serif  | 14px   | 600    | 1.40        |
| H6        | Assistant, system-ui, sans-serif  | 13px   | 600    | 1.40        |
| Body      | Assistant, system-ui, sans-serif  | 15px   | 400    | 1.60        |
| Body Sm   | Assistant, system-ui, sans-serif  | 13px   | 400    | 1.55        |
| Caption   | Assistant, system-ui, sans-serif  | 12px   | 400    | 1.50        |
| Label     | Assistant, system-ui, sans-serif  | 13px   | 600    | 1.35        |
| Button    | Assistant, system-ui, sans-serif  | 15px   | 600    | 1.25        |
| Monospace | JetBrains Mono, monospace         | 14px   | 400    | 1.55        |

Monospace is used exclusively for the generated short URL result display — it aids copy-accuracy for a URL string. All other text uses Assistant.

---

## Spacing System

- **Base unit:** 4px
- **Scale:** 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96

| Alias       | Value | Tailwind Class  | Usage                                              |
|-------------|-------|-----------------|----------------------------------------------------|
| space-xs    | 4px   | p-1 / gap-1     | Icon inner padding, tight inline gaps              |
| space-sm    | 8px   | p-2 / gap-2     | Input inner padding (Y), label-to-input gap        |
| space-md    | 12px  | p-3 / gap-3     | Input inner padding (X), field error gap           |
| space-base  | 16px  | p-4 / gap-4     | Form field vertical gap, card internal padding     |
| space-lg    | 24px  | p-6 / gap-6     | Form card padding, section internal spacing        |
| space-xl    | 32px  | p-8 / gap-8     | Logo-to-form gap, page vertical rhythm             |
| space-2xl   | 48px  | p-12 / gap-12   | Page top/bottom padding on desktop                 |
| space-3xl   | 64px  | p-16 / gap-16   | Hero vertical padding on large screens             |

All padding and margin values in the codebase must be drawn from this scale. No arbitrary or fractional values.

---

## Component Library

### BrandHeader

**Implements:** R-010

- **Variants:** `full` (logo + optional tagline), `minimal` (logo only — used on 404 page)
- **States:** default only (static component, no interactive states)
- **Props:** `variant: "full" | "minimal"`
- **Description:** Centered block at the top of every page. Contains the `<img src="/logo.svg" alt="Citizen Cafe Tel Aviv" />` element. Logo rendered at 280px width on desktop, 200px on mobile — use `next/image` with `priority` to ensure above-the-fold loading. The SVG geometry and fill colors (#FFE300, stroke #000) must not be altered via CSS. No text is placed adjacent to the logo; the SVG lockup is the complete wordmark. On the homepage (full variant), the logo sits 48px from the top of the viewport and has 32px margin below it before the form card. On the 404 page (minimal variant), the logo is followed immediately by the error message block.

---

### ShortenForm

**Implements:** R-009, R-011

- **Variants:** `default`
- **States:** idle, submitting (button spinner + fields disabled), success (result shown below form), error-api (inline API error message), error-validation (field-level inline error)
- **Props:** none (self-contained client component)
- **Description:** White (#FFFFFF) card with 1px #E4E1DC border, 12px border-radius, 32px padding on desktop (24px on mobile). Max-width 480px, horizontally centered on the page. Contains three stacked sections:

  **Section 1 — URL field:**
  Label "Long URL" (Label style, #373230, 6px above input). Text input, full width, 44px height, 12px horizontal / 10px vertical inner padding, 8px border-radius, 1px #E4E1DC border, Assistant 15px, #373230 text, #7A756F placeholder "https://". On focus: border becomes #373230 (2px), box-shadow 0 0 0 3px #FFE300. On error: border becomes #B91C1C (1px); error message (Caption, #B91C1C) appears 4px below the input: "Please enter a valid URL starting with http:// or https://".

  **Section 2 — API Key field:**
  Label "API Key" (Label style, 16px above section). Text input with `type="password"`, full width, same sizing and border treatment as URL field. Placeholder "Enter your API key". Field error state shows "Invalid API key. Please check and try again." (Caption, #B91C1C) 4px below the field after a 401 response.

  **Section 3 — Submit button:**
  ShortenButton component (see below), full width, 16px margin-top from last field.

  **Success state:** After a 201 or 200 response, a Result block replaces the submit button area (button remains visible but below). Result block: light yellow background (#FFFDE7), 1px #FFE300 border, 12px border-radius, 16px padding. Top line: "Your short link:" (Caption, #7A756F). Second line: the full short URL in Monospace 14px, #373230. Third line: CopyButton component right-aligned.

  **Server error state:** A message block appears below the button — same styling as field error but full-width: "Something went wrong. Please try again." (Body Sm, #B91C1C).

  **Submitting state:** Both fields and the button are `disabled`. Button shows spinner. No visual change to fields other than reduced opacity (50%).

---

### ShortenButton

**Implements:** R-009

- **Variants:** `primary` (used in ShortenForm), `ghost` (not used in MVP)
- **States:** default, hover, active, focus, disabled, loading
- **Props:** `isLoading?: boolean`, `disabled?: boolean`, `type: "submit" | "button"`
- **Description:** Full-width button, 48px height, 8px border-radius. Background: #FFE300. Text: "Shorten" in Button style (Assistant 15px/600), color #373230. No border. Hover: background lightens to #FFE033 (5% lighter — same hue, slightly lighter value). Active: `transform: scale(0.98)` over 80ms. Focus: 3px #373230 ring with 2px offset (inverted from default — yellow button needs dark ring for visibility). Disabled: background #FFE300 at 50% opacity, cursor-not-allowed. Loading: spinner icon (16px, #373230) replaces or precedes "Shorten" text; button disabled during load. Min touch target: 48px height satisfies 44px requirement.

---

### CopyButton

**Implements:** R-009

- **Variants:** `inline`
- **States:** default ("Copy"), copied ("Copied!" — 2 seconds, then reverts), unavailable (hidden if Clipboard API blocked)
- **Props:** `value: string` (the URL to copy)
- **Description:** Small ghost-style button, 32px height, 8px border-radius, 12px horizontal padding. Text: "Copy" (Button style, 13px/600, #373230). Border: 1px #E4E1DC. Background: transparent. Hover: background #F5F5F5. On click: calls `navigator.clipboard.writeText(value)`; on success, label changes to "✓ Copied!" with #065F46 text; after 2000ms reverts to "Copy". If Clipboard API unavailable (permissions denied or insecure context), the button is hidden and the URL monospace text is `user-select: all` so the user can select-all manually. `aria-label` updates dynamically: "Copy short URL" (default) → "Copied to clipboard" (copied state).

---

### InputField

**Implements:** R-009, R-011

- **Variants:** `text`, `password`
- **States:** default, focus, error, disabled
- **Props:** `label: string`, `id: string`, `type: "text" | "password"`, `placeholder?: string`, `value: string`, `onChange`, `error?: string`, `disabled?: boolean`
- **Description:** Wrapper that renders `<label>` + `<input>` + optional `<p>` error message. Label: 13px/600, #373230, `display: block`, `margin-bottom: 6px`. Input: full width, 44px height, 12px horizontal / 10px vertical padding, 8px border-radius, 1px #E4E1DC border, 15px Assistant, #373230 text, #7A756F placeholder. Focus: 2px #373230 border, 3px #FFE300 box-shadow ring. Error: 1px #B91C1C border, no ring. Error message: 12px/400 #B91C1C, `margin-top: 4px`. Disabled: 50% opacity on input + label, cursor-not-allowed. `aria-invalid="true"` set when error is present; `aria-describedby` points to error `<p>` element id.

---

### NotFoundPage

**Implements:** R-006, R-010

- **Variants:** default
- **States:** default (static content only)
- **Props:** none (rendered by `[shortcode]/page.tsx` when shortcode not found in DB)
- **Description:** Full-page centered layout (flexbox, column, justify-center, min-height 100vh). Top: BrandHeader (minimal variant), 48px margin-top from viewport top. Below logo: 32px margin. Error heading: "This link doesn't exist or has been removed." in H2 (22px/600, #373230), centered, max-width 380px. Below heading (16px gap): Body Sm text "Double-check the URL or contact whoever sent you this link." in #7A756F, centered, max-width 360px. Below (24px gap): a ghost-style text link "← Go to Citizen Cafe" that navigates to `/` (the homepage). HTTP response status must be 404 — this is enforced server-side in the RSC via Next.js `notFound()`.

---

### PageShell

**Implements:** R-009, R-010 (layout structure for all human-facing pages)

- **Variants:** `centered` (homepage), `error` (404 page)
- **States:** default
- **Props:** `variant: "centered" | "error"`, `children: ReactNode`
- **Description:** Root layout wrapper. Background: #FFFFFF, full viewport height. Centered variant: `display: flex`, `flex-direction: column`, `align-items: center`, `justify-content: flex-start`. Horizontal page padding: 24px on mobile, 48px on tablet+. Max-content width: 600px for the form area, full-width for the outer shell. Error variant: `justify-content: center` (vertically centered content in viewport). The root `<main>` element carries `role="main"`. No navigation bar, no header chrome, no footer — the brand identity lives entirely in the BrandHeader component.

---

## Page Layouts

### Homepage (/)

**Implements:** R-009, R-010, R-011

- **Layout:** Single centered column. PageShell (centered variant). No grid — pure vertical stacking. Max-width 480px for the form card, centered horizontally in the viewport with auto horizontal margins.
- **Components used:** PageShell, BrandHeader (full), ShortenForm (containing InputField ×2, ShortenButton, CopyButton in result state)
- **Content hierarchy:**
  1. BrandHeader — logo SVG, 280px wide, centered, 48px from viewport top.
  2. 32px gap.
  3. ShortenForm card — "Long URL" field, "API Key" field, "Shorten" button stacked vertically with 16px gaps.
  4. [On success] Result block inside the form card — short URL + CopyButton.
  5. [On error] Inline error messages within the form card.
- **Responsive behavior:**
  - Desktop (≥768px): Form card is 480px wide, centered. BrandHeader logo 280px. Page padding 48px top.
  - Mobile (<768px): Form card is full width with 16px horizontal margins. BrandHeader logo 200px. Page padding 32px top.
- **No navigation elements:** There is no nav bar, no footer, no links other than the form. The page has no secondary content. This is intentional per Design Principle 2.

---

### 404 Not Found Page (/[unknown_shortcode])

**Implements:** R-006, R-010

- **Layout:** Full viewport, PageShell (error variant) — vertically and horizontally centered content column.
- **Components used:** PageShell, BrandHeader (minimal), NotFoundPage
- **Content hierarchy:**
  1. BrandHeader — logo SVG, 200px wide, centered, in the upper portion of the centered block.
  2. 32px gap.
  3. Error heading "This link doesn't exist or has been removed." (H2, centered).
  4. 16px gap.
  5. Support text (Body Sm, #7A756F, centered).
  6. 24px gap.
  7. "← Go to Citizen Cafe" ghost link → navigates to `/`.
- **Responsive behavior:** Same proportions at all breakpoints — the centered-column layout is inherently responsive. Logo scales to 160px on mobile.
- **HTTP status:** Must return 404 (not 200). Implemented via `notFound()` in the RSC.

---

## Interaction Patterns

| Pattern                  | Trigger                                              | Behavior                                                                                                             | Duration          |
|--------------------------|------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------|-------------------|
| Form submit — success    | User clicks Shorten with valid URL + correct key     | Button enters loading state (spinner). On 201/200: result block slides in below button (translateY 12px→0 + opacity 0→1). | 200ms slide-in    |
| Form submit — 401 error  | API returns 401 (wrong key)                          | Button returns to default. Error text appears under API Key field: "Invalid API key. Please check and try again."   | Instant           |
| Form submit — network/5xx| Fetch fails or API returns 5xx                       | Button returns to default. Full-width error message below form: "Something went wrong. Please try again."            | Instant           |
| Client-side validation   | User clicks Shorten with URL not starting http(s)    | No API call. Inline error appears under URL field immediately. Focus moves to URL field.                             | Instant           |
| Field validation clear   | User corrects the invalid field and re-types          | Inline error disappears as soon as field value becomes valid (on input event, not on blur).                          | Instant           |
| Loading state            | POST /api/shorten in-flight                          | Both fields disabled (50% opacity). Button shows 16px spinner icon before "Shorten…" text. Cursor: not-allowed on fields. | Until response |
| CopyButton — copy        | User clicks "Copy" on result block                   | Clipboard write executes. Button label animates to "✓ Copied!" (color: #065F46). After 2000ms reverts to "Copy".    | 2000ms            |
| CopyButton — revert      | 2000ms after copy success                            | Label transitions back to "Copy" (color: #373230). Transition: 150ms ease.                                          | 150ms             |
| Result block appear      | API returns success response                         | Result block fades and slides in (opacity 0→1, translateY 8px→0) below the Shorten button.                         | 200ms ease-out    |
| New submission after success | User modifies a field after result is shown     | Result block fades out (opacity 1→0, 150ms). Form returns to idle state. User can submit again.                     | 150ms             |
| Button hover             | Mouse enters ShortenButton                           | Background color transitions from #FFE300 to #FFE033.                                                               | 120ms ease        |
| Button active            | Mouse down on ShortenButton                          | `transform: scale(0.98)`.                                                                                            | 80ms ease         |
| Focus ring               | Keyboard Tab to any interactive element              | 3px solid focus ring: #FFE300 on dark backgrounds, #373230 on light/yellow backgrounds, 2px offset.                 | Instant           |
| Page load                | Initial navigation to any page                       | Next.js App Router — no full-page reload for client navigation. Pages render server-side on first load.              | N/A               |

---

## Responsive Breakpoints

| Name    | Min Width | Max Width  | Layout Changes                                                                                                |
|---------|-----------|------------|---------------------------------------------------------------------------------------------------------------|
| Mobile  | 0px       | 767px      | Form card: full width, 16px horizontal margins. BrandHeader logo: 200px. Page top padding: 32px. Copy button: full-width if clipboard unavailable. |
| Tablet  | 768px     | 1279px     | Form card: 480px fixed, horizontally centered. BrandHeader logo: 240px. Page top padding: 48px.              |
| Desktop | 1280px    | ∞          | Form card: 480px fixed, centered. BrandHeader logo: 280px. Page top padding: 64px.                           |

**Tailwind config:**
```js
// tailwind.config.ts
screens: {
  'sm': '640px',
  'md': '768px',
  'lg': '1024px',
  'xl': '1280px',
}
```

This application has only two pages with minimal layout complexity — the breakpoint system is used primarily to control logo scale, form card width, and vertical padding. There are no multi-column layouts or navigation panels.

---

## Accessibility Requirements

**Standard:** WCAG 2.1 Level AA minimum across all pages.

**Color contrast:**
- Brand Charcoal (#373230) on white (#FFFFFF): 12.6:1 — exceeds AAA.
- Text Muted (#7A756F) on white (#FFFFFF): 4.6:1 — meets AA for normal text.
- Error (#B91C1C) on white: 6.5:1 — meets AA.
- Success (#065F46) on white: 8.4:1 — meets AA.
- Brand Charcoal (#373230) on Brand Yellow (#FFE300): 12.6:1 — meets AAA. This is the only valid text-on-yellow combination.
- Brand Yellow (#FFE300) must never be used as text color — it fails contrast on white (1.07:1).

**Touch targets:**
- ShortenButton: 48px height — satisfies the 44px minimum for all interactive elements (Implements R-009).
- InputField: 44px height — meets minimum.
- CopyButton: 32px visual height — padded to 44px touch target using `py-3` or equivalent.
- All icon-only buttons if added: minimum 44×44px touch target enforced via padding.

**Focus indicators:**
- Default: 3px solid #FFE300 ring with 2px offset on all interactive elements (visible against white and card backgrounds).
- Exception — ShortenButton: because the button background is #FFE300, its focus ring must be 3px solid #373230 with 2px offset to remain visible.
- Focus indicators must never be suppressed (`outline: none` is forbidden without a custom replacement).
- The focus ring is defined globally in `globals.css` using `:focus-visible` — does not appear on mouse click.

**ARIA patterns:**
- `<main role="main">`: wraps the page content area in PageShell.
- ShortenForm: uses `<form>` element with `aria-label="Shorten a URL"`.
- InputField: `<label for="url-input">` paired with `<input id="url-input">`. In error state: `aria-invalid="true"` and `aria-describedby="url-error"` pointing to the error `<p id="url-error">`.
- ShortenButton: `aria-busy="true"` during loading state; `aria-label` updates to "Shortening URL…" during load.
- CopyButton: `aria-label="Copy short URL"` in default state; updates to `aria-label="Copied to clipboard"` after copy action. Live region (`aria-live="polite"`) announces the state change to screen readers.
- NotFoundPage: the error heading uses `role="alert"` or is announced via a page-level `<title>` change ("Link Not Found — Citizen Cafe TLV").
- BrandHeader logo: `<img>` with `alt="Citizen Cafe Tel Aviv"` — describes the full wordmark. If using `<svg>` inline, add `<title>Citizen Cafe Tel Aviv</title>` as the first child with `aria-labelledby` on the SVG.

**Keyboard navigation:**
- Homepage tab order: Logo image (non-focusable) → URL InputField → API Key InputField → ShortenButton → CopyButton (when visible).
- All form interactions completable via keyboard only: Tab to field, type, Tab to next, Enter to submit.
- No keyboard traps — no modals, dialogs, or overlays in this application.
- No custom keyboard shortcuts that conflict with browser defaults.

**Screen reader:**
- The generated short URL result is announced via an `aria-live="polite"` region that is present in the DOM from initial render but empty until a result is returned. This ensures screen readers announce the result without requiring the user to navigate to it.
- Error messages injected into existing `aria-live="assertive"` regions (via `aria-describedby`) so validation errors are announced immediately.
- The "Copied!" state change on CopyButton is announced via the live region update on `aria-label`.
- Page `<title>` elements: Homepage → "Citizen Cafe TLV — Link Shortener"; 404 page → "Link Not Found — Citizen Cafe TLV".
- All images have descriptive `alt` text; decorative elements (if any) use `alt=""`.
