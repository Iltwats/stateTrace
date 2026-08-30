# StateTrace — Complete Implementation Plan

## 1. Executive summary

StateTrace is a WebMCP-native transaction debugger for human-agent workflows in modern web applications. It demonstrates a failure mode that screenshots and DOM interaction handle poorly: a page can visually appear updated while its underlying operation is still pending, has failed, or has been superseded by a newer human edit.

The product is a synthetic order-operations SPA. A human and an agent work on the same order while StateTrace exposes exact transaction state, pending effects, committed revisions, invariants, failure controls, replay operations, and regression fixtures through WebMCP.

The central demo is:

1. An agent stages an address change.
2. The page shows an optimistic update while the synthetic request is pending.
3. The human changes and locks the shipping method.
4. The delayed address request fails.
5. The agent discovers the failure and newer human revision through WebMCP.
6. It retries only the failed address change without overwriting the human's shipping choice.
7. It verifies postconditions and saves the incident as a reproducible regression case.

The language model makes decisions and selects semantic operations. A deterministic in-browser state machine owns transactions, conflicts, retries, invariants, and replay. No API keys, backend, authentication, or external data are required for the MVP.

## 2. Product thesis

### Problem

Browser agents frequently mistake visible or stale UI state for successfully committed application state. Modern SPAs make this especially difficult through optimistic updates, asynchronous effects, retries, modal interruptions, concurrent edits, and state that changes after an agent's last observation.

Traditional automation can answer, “Did the agent click the button?” StateTrace answers the more important questions:

- Did the intended mutation commit?
- Was it applied to the revision the agent expected?
- Did a human change related state in the meantime?
- Which postconditions are now true?
- Can the failed portion be retried without duplicating completed work?
- Can the failure be replayed deterministically?

### Target user

Primary: frontend, QA, and agent-integration developers building WebMCP-enabled transactional applications.

Secondary: product and platform teams reviewing how agents interact with asynchronous application state.

### Value proposition

StateTrace gives humans and agents a shared, inspectable truth layer for web transactions. It makes pending work, committed state, conflicts, verification, and recovery visible in the same page where work occurs.

### Hackathon positioning

StateTrace is not another browser agent. It is an application that becomes meaningfully better when the person and agent share semantic state through WebMCP.

Without WebMCP, the agent must infer transaction success from pixels, labels, and timing. With WebMCP, it can query exact revisions and effects, invoke bounded recovery operations, and verify the final state while the human retains visual control.

## 3. Goals and non-goals

### MVP goals

- Demonstrate optimistic state versus committed state.
- Support concurrent human and agent edits.
- Prevent stale writes with revision checks.
- Make every transaction and state transition visible.
- Provide deterministic failure injection and replay.
- Let the agent recover only failed or incomplete effects.
- Verify final-state postconditions in code.
- Save a failed trace as a reproducible regression fixture.
- Work without WebMCP as an ordinary interactive SPA.
- Run entirely in the browser with no credentials.

### Non-goals

- Connecting to real commerce, payment, CRM, or customer systems.
- General-purpose network interception or browser DevTools replacement.
- Cross-origin automation.
- Running an embedded LLM or requiring a model API key.
- Proving that arbitrary agent workflows are secure.
- Automatic production remediation.
- Distributed event sourcing or a real transaction database.
- Supporting arbitrary user-authored JavaScript fixtures in the MVP.

## 4. The MVP domain

Use a single synthetic order-management workspace. The order contains:

- Customer name and email
- Shipping address
- Shipping method
- Fulfillment status
- Refund status
- Internal note
- Order total and line items
- Current committed revision
- Optimistic view revision
- Field-level locks

The domain provides understandable operations with different risk levels:

- Update an address
- Change a shipping method
- Add an internal note
- Stage a refund
- Approve a staged refund manually

Only address, shipping method, and notes need full implementation for the main demo. Refund staging is useful as a stretch example of a consequential operation requiring human approval.

## 5. Core user experience

### Screen layout

Use one dense but readable application screen:

1. **Order workspace — left/center**
   - Customer and order information
   - Editable address and shipping fields
   - Lock controls on mutable fields
   - Clear optimistic/pending/committed badges
   - Human actions work normally without WebMCP

2. **Truth inspector — upper right**
   - Visible UI state
   - Committed state
   - Current revision
   - Pending effects
   - Failed effects
   - Invariant status

3. **Transaction timeline — lower half**
   - Chronological events
   - Actor badges: Human, Agent, System
   - Started, optimistic, committed, failed, superseded, rolled back
   - Expandable event payload and before/after diff

4. **Failure controls — compact toolbar**
   - Normal
   - Slow next write
   - Fail next write
   - Duplicate response
   - Out-of-order response
   - Reset demo

5. **Recovery and regression panel**
   - Suggested incomplete effects
   - Replay current trace
   - Save as regression fixture
   - List seeded fixtures

### Visual language

- Blue: pending/optimistic
- Green: committed/verified
- Amber: superseded or requires review
- Red: failed or invariant violation
- Purple: agent action
- Gray: system event

Animations should be short and functional: a pending write travels from the order editor to the transaction timeline, then resolves to committed or failed.

## 6. Transaction semantics

StateTrace needs an explicit distinction between four kinds of state:

1. **Committed state**: canonical application truth.
2. **Visible state**: what the user currently sees, including optimistic changes.
3. **Pending effects**: asynchronous operations not yet resolved.
4. **Proposed recovery**: staged corrective operations not yet executed.

### Transaction lifecycle

```text
created
  -> optimistic
  -> pending
  -> committed
     or failed
     or superseded
     or cancelled
```

### Revision rules

- Every committed mutation increments `committedRevision`.
- Every human or agent write includes `expectedRevision`.
- A transaction records `baseRevision` when created.
- A response commits only if its conflict policy permits the current revision.
- Field-level conflict detection prevents an old address operation from overwriting a newer address.
- A non-overlapping newer edit, such as shipping method, should not prevent retrying an address update.
- Locks are checked at execution time, not only when the proposal is created.

### Idempotency rules

- Every transaction has a unique `transactionId`.
- Every logical operation has an `idempotencyKey`.
- Retrying the same successfully committed key returns the existing result.
- Retrying a failed effect may create a new attempt linked to the original transaction.
- Duplicate responses never apply a mutation twice.

### Conflict rules

Use field-aware optimistic concurrency:

- If the target field changed after `baseRevision`, reject with `FIELD_CONFLICT`.
- If only unrelated fields changed, allow a validated retry.
- If the field is locked, reject with `FIELD_LOCKED`.
- If the transaction is already committed, return `ALREADY_COMMITTED`.
- If a referenced order or effect does not exist, return a descriptive not-found error.

## 7. State and event model

Suggested TypeScript types:

```ts
type Actor = "human" | "agent" | "system";
type FieldName = "shippingAddress" | "shippingMethod" | "internalNote";

type Order = {
  id: string;
  customerName: string;
  customerEmail: string;
  shippingAddress: string;
  shippingMethod: "standard" | "express" | "pickup";
  internalNote: string;
  fulfillmentStatus: "unfulfilled" | "processing" | "shipped";
  totalCents: number;
};

type TransactionStatus =
  | "created"
  | "optimistic"
  | "pending"
  | "committed"
  | "failed"
  | "superseded"
  | "cancelled";

type Mutation = {
  field: FieldName;
  previousValue: string;
  nextValue: string;
};

type Transaction = {
  id: string;
  idempotencyKey: string;
  actor: Actor;
  status: TransactionStatus;
  baseRevision: number;
  createdAt: number;
  updatedAt: number;
  mutation: Mutation;
  attempt: number;
  parentTransactionId?: string;
  errorCode?: string;
  errorMessage?: string;
};

type TraceEvent = {
  id: string;
  sequence: number;
  timestamp: number;
  actor: Actor;
  type:
    | "transaction_created"
    | "optimistic_applied"
    | "effect_started"
    | "effect_committed"
    | "effect_failed"
    | "effect_superseded"
    | "field_locked"
    | "field_unlocked"
    | "invariants_checked"
    | "fixture_saved"
    | "trace_reset";
  transactionId?: string;
  revisionBefore: number;
  revisionAfter: number;
  summary: string;
  payload: Record<string, unknown>;
};

type AppState = {
  order: Order;
  visibleOrder: Order;
  committedRevision: number;
  fieldLastChangedRevision: Record<FieldName, number>;
  lockedFields: FieldName[];
  transactions: Transaction[];
  events: TraceEvent[];
  failureMode: FailureMode;
  savedFixtures: RegressionFixture[];
};
```

Persist only saved fixtures and optional preferences. The active demo should reset to a known state.

## 8. Deterministic effect simulator

Implement a browser-side effect scheduler rather than real network calls.

### Required failure modes

1. **Normal**: commits after 600–900 ms.
2. **Slow next write**: commits after approximately 5 seconds.
3. **Fail next write**: returns a synthetic server rejection.
4. **Duplicate response**: produces the same completion twice; idempotency prevents double application.
5. **Out-of-order response**: two effects complete in reverse order.

Use a seeded pseudo-random generator only where jitter is useful. All fixtures must remain reproducible.

### Scheduler responsibilities

- Create an effect record.
- Apply optimistic visible state.
- Queue deterministic completion.
- Honor `AbortSignal` when relevant.
- Resolve according to the active failure mode.
- Check locks, revisions, and field conflicts immediately before commit.
- Append timeline events for every state transition.
- Rebuild visible state from committed state plus still-valid pending changes.

## 9. Invariants and verification

All verification must be deterministic code, not LLM judgment.

Required invariants:

- Visible state equals committed state when no effects are pending.
- No idempotency key commits more than once.
- Committed revision increases monotonically.
- A locked field never changes after the lock event unless explicitly unlocked.
- A failed transaction does not change committed state.
- A superseded transaction does not overwrite a newer field value.
- Every committed transaction has one corresponding commit event.
- Every pending transaction has an active scheduled effect.
- Event sequence numbers are continuous and unique.

Return verification results as structured checks:

```ts
type InvariantResult = {
  id: string;
  label: string;
  passed: boolean;
  severity: "hard" | "warning";
  evidence: string;
  relatedTransactionIds: string[];
};
```

## 10. WebMCP tool surface

Use the imperative `document.modelContext.registerTool()` API. Keep registration in one adapter module and feature-detect support so the ordinary UI remains functional.

### Tool 1: `get_transaction_state`

Purpose: read the current canonical transaction state shared with the user.

Annotation: `readOnlyHint: true`.

Inputs:

```json
{
  "type": "object",
  "properties": {
    "includeRecentEvents": {
      "type": "boolean",
      "description": "Include up to ten recent trace events."
    }
  },
  "additionalProperties": false
}
```

Result:

- Order ID
- Committed revision
- Selected committed fields
- Differences between visible and committed state
- Locked fields
- Pending and failed transaction summaries
- Active failure mode
- Verification summary

Do not return the unbounded complete trace.

### Tool 2: `list_transaction_events`

Purpose: inspect a bounded section of the trace for diagnosis.

Annotation: `readOnlyHint: true`.

Inputs:

- `afterSequence?: number`
- `limit?: number` constrained in code to 1–25
- `transactionId?: string`
- `status?: enum`

Result: compact ordered event records with revision evidence.

### Tool 3: `verify_transaction_state`

Purpose: run deterministic invariants and explicit postconditions against current committed state.

Annotation: `readOnlyHint: true`.

Inputs:

- Optional `expectedRevision`
- Optional expected field values for address, shipping method, or note
- Optional transaction IDs that must be committed or failed

Result: passed/failed checks, evidence, and current revision.

### Tool 4: `stage_order_change`

Purpose: create one bounded optimistic field update on the current order.

Annotation: `readOnlyHint: false`.

Inputs:

- `field`: enum of the three supported mutable fields
- `value`: bounded string or shipping enum
- `expectedRevision`: integer
- `idempotencyKey`: bounded string
- `reason`: concise visible explanation

Execution rules:

- Validate again in code.
- Reject locked fields.
- Reject stale changes to the target field.
- Append an agent-attributed timeline event.
- Update visible state before returning.
- Return transaction ID, status, base revision, and expected resolution time.

### Tool 5: `retry_failed_transaction`

Purpose: retry one failed transaction without repeating already committed effects.

Annotation: `readOnlyHint: false`.

Inputs:

- `transactionId`
- `expectedRevision`
- `idempotencyKey`

Execution rules:

- Only failed or superseded transactions are eligible.
- Recheck field conflicts and locks.
- Link retry to the original transaction.
- Never copy an obsolete value over a newer human value.

### Tool 6: `save_regression_fixture`

Purpose: save the current trace, failure configuration, starting state, actions, and expected invariants as a local regression fixture.

Annotation: `readOnlyHint: false`.

Inputs:

- `name`: 1–80 characters
- `description`: 1–240 characters
- `expectedOutcome`: enum such as `recovered`, `conflict_detected`, `write_failed`

Result: fixture ID, number of events, and expected checks.

### Tool design constraints

- Every schema uses `additionalProperties: false`.
- Tool names and purposes do not overlap.
- All result payloads are concise.
- Descriptions say what the tool does and when it is appropriate.
- Read and write annotations are accurate.
- User-generated notes should be treated as untrusted content in any tool that returns them.
- All write results include a new state summary so the agent can verify progress.
- Registration lifetime is controlled with `AbortController`.
- Tool execution handles cancellation signals.

## 11. Human controls and safety

- Humans can lock or unlock mutable fields.
- Every agent write is attributed in the timeline.
- The user can cancel a pending effect.
- Reset returns to a deterministic fixture.
- Regression fixtures are local and removable.
- No tool can hide, delete, or rewrite trace history during the current session.
- Consequential refund execution is not part of MVP; only staging is permitted if implemented.
- Errors are descriptive enough for an agent to recover without exposing stack traces.

## 12. Architecture

### Recommended stack

- React 19 + TypeScript
- Vite
- Zustand for the shared store
- Zod for code-level input validation
- Vitest + React Testing Library
- `webmcp-types` for WebMCP typings
- CSS Modules or Tailwind, based on existing familiarity
- `localStorage` for saved regression fixtures
- Static hosting

Avoid adding a backend. A service worker is also unnecessary for the MVP because the effect simulator should be explicit and deterministic.

### Logical layers

```text
React UI
  | reads/actions
Shared Zustand store
  | delegates mutations
Transaction engine
  | schedules effects
Deterministic effect simulator
  | emits
Append-only trace + invariant engine

WebMCP adapter
  | calls the same transaction engine and selectors as the UI
document.modelContext
```

The UI and WebMCP executors must never maintain separate application state.

### Proposed folder structure

```text
src/
  app/
    App.tsx
    routes.ts
  components/
    OrderWorkspace/
    TruthInspector/
    TransactionTimeline/
    FailureControls/
    RegressionPanel/
    Shared/
  domain/
    order.ts
    transaction.ts
    events.ts
    fixtures.ts
  engine/
    transactionEngine.ts
    effectScheduler.ts
    conflictDetection.ts
    idempotency.ts
    invariantEngine.ts
    replayEngine.ts
  store/
    useStateTraceStore.ts
    selectors.ts
  webmcp/
    registerTools.ts
    schemas.ts
    serializers.ts
    types.ts
  fixtures/
    baseline.ts
    failedWrite.ts
    concurrentEdit.ts
    duplicateResponse.ts
    outOfOrder.ts
  tests/
    engine/
    webmcp/
    integration/
  styles/
```

## 13. Seeded scenarios

### Scenario A: failed optimistic address update

- Agent updates address.
- UI changes optimistically.
- Effect fails.
- Visible state rolls back.
- Agent identifies failure and retries.

### Scenario B: concurrent non-overlapping human edit

- Agent updates address with a slow effect.
- Human changes shipping method.
- Address operation fails.
- Agent retries address only.
- Human shipping choice remains intact.

This is the primary demo scenario.

### Scenario C: conflicting human edit

- Agent updates address with a slow effect.
- Human changes the same address before resolution.
- Old agent effect is superseded.
- Retry is rejected until the agent rereads current state.

### Scenario D: duplicate completion

- One effect completion is delivered twice.
- Idempotency applies it once.
- Verification confirms one revision increment.

### Scenario E: out-of-order responses

- Two note/address effects are queued.
- Second resolves before first.
- Field-aware concurrency preserves valid independent changes.

## 14. Implementation sequence

### Phase 0 — Freeze the contract, 2–3 hours

- Finalize the main scenario and success state.
- Write TypeScript domain types.
- Define six tool contracts before building UI.
- Write invariant list and scenario truth tables.
- Create a low-fidelity screen sketch.

Exit criterion: every state transition in the primary demo is described unambiguously.

### Phase 1 — Deterministic transaction engine, 8–10 hours

- Implement canonical and visible state separation.
- Implement transaction creation and lifecycle.
- Implement revisions and field-last-changed tracking.
- Implement lock checks and field-aware conflicts.
- Implement idempotency.
- Implement effect scheduler and normal/fail/slow modes.
- Implement append-only trace events.
- Add engine unit tests before UI integration.

Exit criterion: all five seeded scenarios can run from tests without React.

### Phase 2 — Human UI, 8–10 hours

- Build the order workspace.
- Add editable fields and locks.
- Add truth inspector.
- Add timeline with actor/status filters.
- Add failure controls and deterministic reset.
- Show visible versus committed diffs.
- Add cancellation where supported.

Exit criterion: the primary scenario can be demonstrated manually with no WebMCP.

### Phase 3 — Verification, replay, and fixtures, 6–8 hours

- Implement invariant engine.
- Add verification panel and evidence links.
- Implement replay from a saved starting state and action sequence.
- Implement local regression fixture serialization.
- Ship five built-in fixtures.

Exit criterion: each fixture produces its expected deterministic verification result.

### Phase 4 — WebMCP integration, 8–10 hours

- Add `webmcp-types`.
- Implement feature detection and registration lifecycle.
- Implement and validate the three read tools.
- Implement and validate the three write tools.
- Ensure all tool writes use the transaction engine.
- Append agent attribution to the timeline.
- Add a visible WebMCP availability indicator.
- Test cancellation and component teardown.

Exit criterion: the main workflow succeeds through ChatGPT/Codex without UI clicking by the agent.

### Phase 5 — Evaluation and hardening, 8–10 hours

- Write tool contract tests.
- Create 15–20 natural-language evaluation prompts.
- Test expected first tool and forbidden tools.
- Test malformed IDs, stale revisions, locked fields, and duplicate keys.
- Run ten complete cold/reset demos.
- Reduce tool descriptions or result size if selection is unstable.
- Verify no console errors on the happy path.

Exit criterion: ten consecutive primary-demo runs complete without manual repair outside the scripted human intervention.

### Phase 6 — Polish and submission, 8–12 hours

- Refine visual hierarchy and responsive layout.
- Add concise onboarding copy and a “Run demo” checklist.
- Deploy to a stable public URL.
- Test in the ChatGPT in-app browser and WebMCP-enabled Chrome.
- Add README, architecture diagram, testing instructions, screenshots, and license.
- Record the under-three-minute YouTube video.
- Complete Devpost text around the four required questions.

## 15. Four-day schedule

### Day 1

- Phase 0
- Phase 1
- Start engine tests

Deliverable: deterministic transaction engine with normal, slow, and failed writes.

### Day 2

- Finish engine tests
- Phase 2
- Primary scenario works manually

Deliverable: complete product shell with timeline and truth inspector.

### Day 3

- Phase 3
- Phase 4
- Test WebMCP in the target browser

Deliverable: agent can inspect, stage, retry, verify, and save a fixture.

### Day 4

- Phase 5
- Phase 6
- Deployment, README, video, and submission

Deliverable: stable public submission with evaluation evidence.

Maintain a hard cut line: if behind schedule, ship three failure modes, four tools, and one regression fixture. Do not sacrifice the primary human-interruption workflow, visible trace, or verification.

## 16. Testing plan

### Unit tests

- Revision increments only on commit.
- Failed writes never mutate committed state.
- Locked fields reject writes.
- Same-field stale writes are rejected.
- Independent-field retry succeeds after another field changes.
- Duplicate idempotency keys commit once.
- Out-of-order effects produce the expected final state.
- Visible state is rebuilt correctly after failure.
- Invariant engine catches intentionally corrupted fixture data.

### Integration tests

- Human edits update the same store used by WebMCP executors.
- Timeline attribution is correct.
- Reset cancels pending effects and restores the fixture.
- Saving and loading regression fixtures is deterministic.
- Tool results match visible UI state.

### WebMCP evaluation prompts

Include positive and negative cases:

1. “Inspect the current order and tell me what is pending. Do not change anything.”
2. “Verify whether the address change really committed.”
3. “Retry only the failed address operation and preserve my shipping choice.”
4. “Change the locked shipping method to express.”
5. “Run verification but do not retry anything.”
6. “Save this failure as a regression fixture named Concurrent shipping edit.”
7. “Apply the same transaction again with the same idempotency key.”
8. “Retry transaction `missing-id`.”

For each prompt record:

- Expected first relevant tool
- Tools that must not be called
- Argument validity
- Final committed state
- Final revision
- Expected visible panel or timeline event

### Target metrics

- At least 90% correct first-tool selection across 15–20 prompts.
- 100% stale same-field writes rejected.
- 100% locked-field writes rejected.
- 100% duplicate effects applied no more than once.
- 100% agent writes visible and attributed.
- Five seeded scenarios replay deterministically.
- Ten consecutive clean main-demo runs.
- Main demo completes in under 100 seconds.

## 17. Primary demo script

### 0:00–0:20 — Problem

Show the order workspace, committed-state inspector, and timeline.

Narration: “Modern web apps often display an optimistic success before the underlying operation has committed. Agents usually see the interface, but not the transaction truth.”

### 0:20–0:45 — Agent stages an update

Set “fail next write” or use the prepared scenario. Ask the agent to update the shipping address. Show the visible address change and pending transaction.

### 0:45–1:05 — Human intervenes

While the address operation is pending, manually change the shipping method to pickup and lock it. The address request then fails.

### 1:05–1:35 — Agent diagnoses and recovers

Ask: “Recover the failed address change, preserve my shipping selection, and verify the result.”

The agent should:

1. Call `get_transaction_state`.
2. Inspect the failed transaction/events if needed.
3. Call `retry_failed_transaction` with the current revision.
4. Call `verify_transaction_state`.

### 1:35–1:55 — Proof

Show:

- Address committed
- Human shipping choice preserved
- Locked field unchanged
- No pending effects
- All invariants green
- Complete human/agent/system trace

### 1:55–2:15 — Regression fixture

Ask the agent to save the trace as a regression fixture. Show it appearing in the fixture panel and replay it quickly.

### 2:15–2:30 — Close

“StateTrace uses WebMCP not merely to act on a page, but to expose semantic transaction state, recovery, and verifiable postconditions while the human remains in control.”

## 18. README and Devpost narrative

Structure both around the official questions:

### Why is this a strong fit for WebMCP?

Transaction revisions, pending effects, idempotency, conflicts, and postconditions are meaningful application semantics that cannot be reliably inferred from pixels or generic DOM interaction.

### How does it create a better experience?

The user sees agent operations in the same workspace, can intervene at any time, and can verify or replay the outcome rather than trusting a success message.

### What can people and agents do together that was difficult before?

A human can change live state during an agent operation; the agent can detect the newer revision, preserve the human decision, recover the incomplete portion, and prove the final result.

### How was WebMCP implemented?

StateTrace registers focused imperative tools over the same deterministic transaction engine used by the React UI. Read tools expose bounded state and verification; write tools stage or retry validated transactions. All operations use revision checks, idempotency, cancellation, and visible trace attribution.

## 19. Risks and mitigations

### Risk: it looks like a developer toy

Mitigation: ground the entire demo in one understandable order-address failure. Introduce technical vocabulary only after showing the visual problem.

### Risk: too much time is spent on event sourcing

Mitigation: keep a single in-memory order, one append-only array, and deterministic effects. Do not add a database or generic event framework.

### Risk: the agent chooses overlapping tools

Mitigation: keep read, verify, stage, retry, and save purposes distinct. Evaluate descriptions against positive and negative prompts.

### Risk: replay is too complex

Mitigation: fixtures store a starting snapshot, failure mode, ordered actions, and expected invariants. Replay only built-in StateTrace actions.

### Risk: WebMCP availability changes

Mitigation: feature-detect `document.modelContext`, isolate integration in one adapter, use current typings, and preserve the complete manual UI.

### Risk: security claims are challenged

Mitigation: describe StateTrace as a deterministic reliability and debugging environment. Do not claim that it prevents arbitrary prompt injection or secures real production transactions.

### Risk: video becomes too technical

Mitigation: make the failed optimistic update, human shipping edit, recovery, and green verification visible before explaining implementation.

## 20. MVP cut line and stretch goals

### Non-negotiable MVP

- One order
- Address, shipping method, and note fields
- Visible versus committed state
- Normal, slow, and failed effects
- Revision and field-lock enforcement
- Append-only timeline
- Deterministic invariant checks
- Four essential tools: get state, verify, stage change, retry failed transaction
- Main concurrent-human-edit demo
- Reset button
- Public deployment and documentation

### First stretch

- Duplicate and out-of-order scenarios
- Regression fixture saving and replay
- Timeline filters and event diffs
- Tool evaluation dashboard

### Second stretch

- Consequential refund staging with a human-only approval form
- Exportable fixture JSON
- Side-by-side baseline comparison against low-level UI automation
- Lightweight performance/token measurements

## 21. Definition of done

The project is ready to submit when all of the following are true:

- The deployed app loads without credentials.
- The ordinary human UI works when WebMCP is unavailable.
- Supported browsers discover the documented tools.
- The main scenario works ten times consecutively from reset.
- The agent preserves the human shipping edit and lock.
- A failed address effect can be retried without duplicate commits.
- Verification reports evidence for every hard invariant.
- Every agent mutation appears in the timeline.
- Invalid IDs, stale revisions, locked fields, and duplicate keys fail gracefully.
- Five seeded scenarios have deterministic expected results, or at least three at the MVP cut line.
- The repository contains source, setup instructions, architecture, testing instructions, screenshots, and a visible open-source license.
- The public YouTube demo is under three minutes and includes audio.
- The Devpost description explicitly covers WebMCP fit, user experience, human-agent collaboration, and implementation.

## 22. Immediate next actions

1. Initialize the Vite React TypeScript application.
2. Add the domain types and fixture truth tables before UI components.
3. Implement revision, conflict, and idempotency tests.
4. Build the deterministic effect scheduler.
5. Integrate the order editor and timeline.
6. Add the four essential WebMCP tools.
7. Validate the primary demo in the target browser before adding stretch features.

## 23. Primary references

- WebMCP Challenge: https://webmcp.devpost.com/
- Official rules: https://webmcp.devpost.com/rules
- WebMCP specification: https://webmachinelearning.github.io/webmcp/
- Chrome imperative API: https://developer.chrome.com/docs/ai/webmcp/imperative-api
- Chrome WebMCP best practices: https://developer.chrome.com/docs/ai/webmcp/best-practices
- Chrome WebMCP security: https://developer.chrome.com/docs/ai/webmcp/secure-tools
- HN stale-state discussion: https://news.ycombinator.com/item?id=47336171
- HN browser abstraction discussion: https://news.ycombinator.com/item?id=46901233
- HN automation reproducibility discussion: https://news.ycombinator.com/item?id=46794863

