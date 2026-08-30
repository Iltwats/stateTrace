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
