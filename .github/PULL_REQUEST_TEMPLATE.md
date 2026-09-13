## What this changes

<!-- One or two sentences. Link the issue if there is one. -->

## Why

<!-- The workflow or defect this addresses. -->

## How to see it working

<!-- The UI steps or tool calls a reviewer should run in the app, not just the diff. -->

## Checklist

- [ ] `npm test` passes
- [ ] `npm run format:check` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] Human UI and WebMCP tools still share one transaction engine — no separate state
- [ ] Every new mutation is recorded in the append-only trace with an actor
- [ ] Form mutations still create automatic restore points
- [ ] New or changed tool schemas are `.strict()` and revalidated inside the handler
- [ ] Tests added or updated alongside the change
- [ ] `evals/statetrace.json` updated if tool selection behavior changed
- [ ] README updated if the tool table, UI flow, or setup steps changed
