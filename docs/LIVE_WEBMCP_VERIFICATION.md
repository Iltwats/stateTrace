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

Chrome's enabled host confirmed that the page successfully registered the six semantic tools. The browser-control test surface does not expose the host's consumer-side tool invocation channel, so execute-path coverage remains in `src/webmcp/registerTools.test.ts`, where every registered handler is invoked against the same production store and transaction engine used by the UI.

This keeps the evidence split cleanly:

- Live Chrome verifies native discovery, registration lifecycle, visible state, and browser diagnostics.
- Vitest verifies tool inputs, read/write handlers, deterministic verification, cancellation cleanup, and failure behavior.

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
