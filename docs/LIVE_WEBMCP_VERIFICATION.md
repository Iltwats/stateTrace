# Live WebMCP verification

This checkpoint records the manual Chrome verification for StateTrace after enabling the WebMCP developer flag.

## Environment

- Date: 2026-08-30
- Browser: Chrome with the WebMCP developer flag enabled
- App: Vite development server at `http://127.0.0.1:5173/`

## Results

| Check | Result |
| --- | --- |
| Native registration | Pass — the UI reports `6 WebMCP tools available` instead of manual mode. |
| Registration lifecycle | Pass — all six tools re-register after a full page reload. |
| Visible failure path | Pass — a rejected agent address write produced four trace events and one failed transaction. |
| State safety | Pass — the rejected write left committed revision `1` unchanged and all `7/7` invariants passed. |
| Reset lifecycle | Pass — resetting the trace and reloading returned the app to revision `1` with `7/7` invariants. |
| Browser diagnostics | Pass — no warning or error entries were reported by the Chrome console. |

## Invocation coverage

The initial Chrome checkpoint verified discovery and registration. A later in-app browser checkpoint also exercised the consumer-side channel against the production page:

- `get_transaction_state` returned revision `1`, no pending work, and `7/7` passing invariants.
- `stage_order_change` staged a real agent-owned address update and the visible commerce form settled to revision `2` with three trace events.
- `verify_transaction_state` passed the exact revision, address, shipping-method, transaction-status, and invariant postconditions.
- The live host omitted the nominally required execution `AbortSignal`. StateTrace now treats that signal as optional while still honoring it when supplied; a regression test protects both host shapes.

Vitest continues to cover schema rejection, read/write handlers, retries, deterministic verification, cancellation cleanup, idempotency, and failure behavior.

## Observability console verification

The Git-like observability redesign was browser-tested against the complete recovery scenario:

| Check | Result |
| --- | --- |
| Desktop hierarchy | Pass — repository identity, branch, HEAD, working tree, effect health, commit graph, diff inspector, and invariant monitor are visible at 1280×720. |
| Failure evidence | Pass — rejecting the address transaction produced six events, one exception, a clean rolled-back working tree, and 7/7 passing invariants. |
| Targeted recovery | Pass — retry advanced HEAD from `r3` to `r4`, committed the address, and preserved the human-protected pickup path. |
| Commit graph | Pass — the recovered trace contains nine actor-attributed events and marks the newest event as `HEAD`. |
| Responsive layout | Pass — at 390×844 the console retained its resource, branch, graph, and invariant information with no horizontal overflow. |
| Browser diagnostics | Pass — the redesigned workflow produced no warning or error console entries. |

## Open-source commerce UI verification

This checkpoint covers the black-and-gold commerce redesign and drawer interaction requested for the public demo.

- Date: 2026-09-14
- Browser: Codex in-app browser with native WebMCP discovery and invocation
- App: Vite development server at `http://127.0.0.1:5173/`

| Check | Result |
| --- | --- |
| Commerce framing | Pass — order context, line items, total, fulfillment form, and agent delivery simulator are visible in the primary workflow. |
| Human/agent ownership | Pass — fields visibly distinguish shared, human-edited, agent-edited, and human-protected states. |
| Trace drawer | Pass — the stack trace opens from the header, receives focus, closes on Escape, restores trigger focus, and renders the complete actor-attributed commit graph. |
| Failure and retry | Pass — a rejected address update produced six events and one exception; retry advanced HEAD from `r3` to `r4` while preserving the locked pickup method. |
| Mobile drawer | Pass — at 390×844 both the page and full-width trace drawer measured 390 pixels with no horizontal overflow. |
| Browser diagnostics | Pass — no warning or error console entries were reported. |

## Minimal demo verification

The public demo was simplified again on 2026-09-14 so the WebMCP story is understandable without reading an observability dashboard first.

| Check | Result |
| --- | --- |
| Default-page complexity | Pass — the initial accessibility surface dropped from roughly 180 nodes to 52 and now contains only the product header, one-line explanation, suggested agent prompt, order form, and latest-activity preview. |
| Pending-state visibility | Pass — a WebMCP address update immediately appears in the form with `Agent updated` and `Agent change is being verified…` before it commits. |
| Native WebMCP execution | Pass — `stage_order_change` returned a pending transaction, the page settled to revision `2`, and `verify_transaction_state` passed the exact address and committed-status postconditions. |
| Activity drawer | Pass — the drawer shows only revision, event count, safety status, and the three actor-attributed events required to explain the update. |
| Responsive layout | Pass — the page and drawer remain exactly 390 pixels wide at a 390×844 viewport with no horizontal overflow. |
| Browser diagnostics | Pass — no warning or error console entries were reported. |

## Final storefront and checkpoint verification

The submission demo now opens with a focused StateTrace identity screen and
then moves into a realistic ecommerce checkout. The public-facing activity UI
is intentionally limited to information a shopper needs: what changed, whether
the user or agent changed it, the before-and-after values, and whether it was
applied.

| Check | Result |
| --- | --- |
| Opening experience | Pass — the `State` and `Trace` wordmarks run the `name-arrive` animation for `900ms`, followed by the WebMCP observability statement and one checkout CTA. |
| Visual system | Pass — the StateTrace entrance and Aurum store now share a coherent carbon-black and warm gold-orange identity, with mint reserved for live connection status. No purple or indigo accents remain in the visible checkout. |
| Complete checkout | Pass — the Aurum demo uses familiar retail navigation, checkout progress, contact email, delivery address and method, delivery instructions, cardholder name, demo payment details, coupon, line items, and totals. |
| Section hierarchy | Pass — Contact, Delivery, Payment, and Discount render as separate elevated cards with consistent spacing instead of one visually dense form surface. |
| Familiar payment entry | Pass — card number, expiry, and CVC use the same recessed control treatment; the demo card formats while typing and visibly detects Visa, Mastercard, American Express, and Discover. The fields are local-only and never submit a payment. |
| Coupon application | Pass — the coupon field has an adjacent Apply action that chooses an 8%, 12%, 15%, or 20% surprise discount and updates the explicitly labeled `Discount (CODE)` row, total, and Pay label immediately. |
| Select affordance | Pass — the shipping selector reserves 46 pixels for its custom gold chevron, preventing the arrow from overlapping the field edge on desktop and mobile. |
| Completion flow | Pass — Pay opens a centered animated order-complete dialog with a concise confirmation and no demo disclaimer, moves focus to `Start again`, and the action clears local payment fields and restores the baseline checkout. The dialog remains fully visible at `390×844`. |
| Field auto-save | Pass — valid text edits display `Auto-saving…`, commit after a short debounce, update Activity, and create a restore point without rendering Cancel or Save buttons. Invalid drafts remain local and explain what must be corrected. |
| Native WebMCP write | Pass — the browser discovered six page tools, read revision `2`, staged an agent-owned address change, and observed it commit at revision `3`. |
| Human/agent activity | Pass — the drawer separately showed the human coupon edit and the agent address edit, including actor, old value, new value, and applied status. No internal safety panel or system-event stream is shown. |
| Automatic restore points | Pass — human changes, agent writes, and retries create a restore point before mutation. There is no manual save control. Restoring revision `1` retained the original action and added the reverse diff to activity instead of erasing history. |
| Responsive layout | Pass — the checkout and full-width activity drawer have no horizontal overflow at `390×844`. |
| Browser diagnostics | Pass — no warning or error console entries were reported during the end-to-end workflow. |
