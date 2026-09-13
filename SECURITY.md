# Security Policy

## Scope

StateTrace is a synthetic, client-only application. It has no application
backend, authentication, or real commerce integration. Checkout state lives in
the browser tab and is discarded on reload. The hosted site uses Vercel
Analytics and Speed Insights for aggregate usage and performance telemetry; the
application does not send checkout form values to a StateTrace server.

That limits the blast radius of most classes of bug, but two areas still matter
and reports about them are genuinely useful:

- **Tool-boundary defects.** A WebMCP tool that accepts input its schema should
  have rejected, mutates committed state on a failed effect, bypasses a human
  field lock, applies a duplicate idempotency key twice, or writes without a
  revision check.
- **Untrusted-content handling.** User-generated content (order notes, trace
  entries) that is returned through WebMCP without its untrusted marking, or
  rendered in the UI in a way that permits injection.

## Explicitly out of scope

StateTrace does not claim to prevent arbitrary prompt injection against an
agent, and reports asserting that a model can be talked into calling a tool are
not vulnerabilities in this project. The defensible claim is narrower and is
what should be tested: **whatever the agent is persuaded to attempt, the
application's transaction rules still hold, and the human still sees it.**

Also out of scope: findings that require modifying the application's own
source or devtools-executing arbitrary JavaScript in the page, denial of
service against a local dev server, and missing hardening headers on a static
demo host.

## Reporting a vulnerability

Please do not open a public issue for security reports.

Use GitHub's private reporting flow: **Security → Report a vulnerability** on
[the repository](https://github.com/Iltwats/stateTrace/security/advisories/new).

Include the browser and WebMCP host you used, the sequence of tool calls or UI
actions, the state you expected, and the state you observed. When relevant, ask
the agent to call `save_regression_fixture` and include the returned fixture
details so the trace can be replayed deterministically.

## Response

This project is maintained on a best-effort basis. Expect an acknowledgement
within about a week. Confirmed tool-boundary defects will be fixed with a
regression test added to the suite.

## Supported versions

Only the `main` branch is supported.
