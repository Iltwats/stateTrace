# Contributing to StateTrace

Thanks for your interest. StateTrace is a focused reference implementation of
observable human-agent workflows built with
[WebMCP](https://github.com/webmachinelearning/webmcp). Contributions that make
those workflows clearer, safer, or easier to adapt are welcome.

## Ground rules

StateTrace has one architectural rule that everything else follows from:

> The human UI and the WebMCP tools never hold separate application state.
> Both call the same transaction engine.

A change that gives the agent a shortcut the human does not have — or gives the
human a mutation the trace does not record — is out of scope, however
convenient it looks. If you are unsure whether a change fits, open an issue
before writing code.

## Getting set up

Requires Node.js 20 or later (`.nvmrc` pins 22) and npm.

```bash
git clone https://github.com/Iltwats/stateTrace.git
cd stateTrace
npm install
npm run dev
```

Open `http://localhost:5173`.

## Before you open a pull request

```bash
npm run format:check  # Prettier validation
npm run typecheck     # TypeScript validation
npm test              # Vitest suite
npm run build         # Type check plus production bundle
```

All four commands must pass. CI runs the same checks on every pull request.
`npm install` also activates a Husky pre-commit hook that formats supported
staged files with Prettier through lint-staged.

## What good changes look like

- **Keep tools bounded.** Every WebMCP tool takes a closed schema
  (`.strict()`, no unknown properties) and revalidates its inputs inside the
  handler. Never trust a schema alone.
- **Keep writes revision-aware.** A write carries the revision the caller
  observed. Stale same-field writes are rejected; safe independent writes are
  not.
- **Keep verification deterministic.** Invariants and replay are plain code.
  Do not introduce a check whose result depends on a model's judgment.
- **Keep every mutation visible.** A state transition that does not appear in
  the append-only trace with an actor attached is a bug.
- **Keep restoration automatic.** Human edits, agent writes, and retries create
  a checkpoint before mutation. Do not add a manual save requirement.
- **Add tests next to the code.** Engine changes need engine tests; tool
  changes need tests in `src/webmcp/registerTools.test.ts` that drive the real
  store.

## Adding or changing a WebMCP tool

1. Define the schema in `src/webmcp/schemas.ts` with `.strict()`.
2. Register the handler in `src/webmcp/registerTools.ts`, honoring the
   `AbortSignal` for cancellation and cleanup.
3. Shape read responses through `src/webmcp/serializers.ts` and set accurate
   WebMCP annotations, including untrusted-content hints where appropriate.
4. Add a case to `evals/statetrace.json` covering both correct selection and
   the requests that must _not_ reach your tool.
5. Update the tool table in [`README.md`](README.md).

## Commit and PR style

Commits follow Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`,
`refactor:`, `chore:`). Keep pull requests focused on one change and describe
what a reviewer should look at in the running app, not only in the diff.

## Reporting problems

Use the issue templates. For anything security-related, follow
[`SECURITY.md`](SECURITY.md) instead of opening a public issue.

## License

By contributing you agree that your contributions are licensed under the
project's [Apache License 2.0](LICENSE).
