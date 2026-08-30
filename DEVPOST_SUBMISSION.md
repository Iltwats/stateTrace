# StateTrace — Devpost submission copy

## Project name

StateTrace

## Tagline

See what an agent tried, what actually committed, and recover safely without overwriting the human.

## Short description

StateTrace is a WebMCP-native transaction observatory for human-agent workflows. It gives people and agents one shared, visible source of truth for optimistic changes, committed state, failures, locks, retries, and deterministic verification.

## Inspiration

AI agents are becoming good at clicking buttons and filling forms, but consequential web tasks are not just sequences of clicks. A page can look updated while a network request is still pending. A write can fail after the interface optimistically shows success. A human can make a newer decision while an agent is still working. Retrying the whole task can then duplicate an action or overwrite the human.

The missing layer is not another chat window. It is a shared transaction model that both the person and the agent can understand.

We built StateTrace to explore that layer. Instead of asking an agent to infer application state from pixels or DOM text, the website exposes the semantics that matter: the current revision, committed and optimistic values, pending and failed effects, human locks, idempotency, transaction history, and verifiable postconditions.

## What it does

StateTrace is an interactive order-management scenario designed to make unreliable human-agent workflows visible and recoverable.

A person can deliberately introduce a slow, failed, duplicated, or out-of-order effect. An agent can stage an address or shipping change through WebMCP. While that operation is pending, the person can make a newer choice and lock the field. If the agent's operation fails, StateTrace rolls back only the optimistic value, preserves the person's newer decision, and records the complete sequence in an append-only timeline.

The agent can then inspect the authoritative state, retry only the failed transaction at the current revision, verify deterministic postconditions, and save the recovered trace as a regression fixture. The person sees every agent, human, and system action in the same interface throughout the process.

StateTrace exposes six focused WebMCP tools:

- `get_transaction_state` reads the current revision, committed values, optimistic differences, locks, pending work, failures, and verification summary.
- `list_transaction_events` returns a bounded, ordered part of the visible transaction history.
- `verify_transaction_state` checks hard invariants and exact expected outcomes without changing state.
- `stage_order_change` stages one validated, visible optimistic mutation at an observed revision.
- `retry_failed_transaction` retries only an eligible failed or superseded transaction while preserving newer human state.
- `save_regression_fixture` captures the trace as a deterministic, replayable fixture.

## What can people use this to do in real life?

The current hackathon application is a safe, synthetic order workflow rather than a connection to a real store. As built today, it is useful to developers, QA engineers, product teams, and reliability teams creating websites where humans and agents may act at the same time.

They can use StateTrace to:

1. **Reproduce difficult race conditions.** Deliberately slow or fail a write, edit the same workflow as a human, and observe exactly which value was optimistic, which value committed, and why another transaction was rejected.
2. **Test whether an agent respects human decisions.** Lock an address, shipping option, or note and verify that an agent cannot silently overwrite it.
3. **Recover only incomplete work.** Retry the failed address correction without repeating already completed actions or reverting a newer shipping choice.
4. **Prove the final result.** Check deterministic invariants such as “failed writes never committed,” “idempotency keys committed at most once,” and “visible state settled to committed state.”
5. **Turn production-shaped failures into regression tests.** Save and replay the full sequence so the same concurrency bug cannot quietly return later.
6. **Explain what happened.** Use the actor-attributed timeline to distinguish what the person requested, what the agent attempted, what the system accepted, and what actually committed.

The order scenario represents a common everyday moment: you ask an assistant to correct a delivery address, then change the delivery method yourself while it is working. A conventional agent may see its first action fail and restart the entire task, potentially erasing your newer choice. With StateTrace's interaction model, the assistant detects the newer revision, preserves your locked delivery choice, retries only the failed address update, and proves the final state before declaring success.

The same pattern can extend beyond commerce:

- A travel assistant can reschedule one failed booking step without undoing a hotel choice the traveler just changed.
- A customer-support agent can recover an incomplete account update without repeating a completed refund or overwriting a staff note.
- A finance workflow can stage a change while a person retains control of approval-sensitive fields.
- A cloud operations assistant can retry one failed configuration change while respecting a newer operator lock.

StateTrace does not claim to provide these production integrations today. It demonstrates and tests the transaction protocol those applications need.

## Why this is a strong fit for WebMCP

The most important StateTrace data cannot be reliably inferred from a screenshot: a revision number, an idempotency key, a pending effect, the difference between optimistic and committed state, or whether a failed transaction is safe to retry. These are application semantics, so the application should expose them directly.

WebMCP lets StateTrace describe precise, bounded operations instead of making the agent reverse-engineer the interface. Read tools and write tools have distinct purposes and annotations. Inputs are schema-validated, unknown properties are rejected, and writes require the revision the caller observed. This makes the agent faster and more reliable while keeping the human-facing interface authoritative and visible.

WebMCP is not an add-on in StateTrace. It is the bridge that allows an agent to participate in the same transaction model as the person.

## How it creates a better user experience

Most agent interfaces ask the user to trust a message such as “Done.” StateTrace replaces that trust gap with evidence.

The person can see:

- the optimistic value and the committed value separately;
- pending, failed, superseded, and committed transactions;
- which actor caused each event;
- the revision on which a write was based;
- fields the person has locked against agent changes;
- exactly which invariants and postconditions passed;
- a replayable record of the complete recovery.

Agent actions never disappear into a background process. Every mutation is reflected in the same workspace the person controls, and ordinary manual interaction remains available even when WebMCP is unavailable.

## What people and agents can do together that was difficult before

A person can change their mind while an agent is already acting. The agent can notice that newer state, avoid overwriting it, recover only the incomplete portion of its work, and verify the joint result.

That is different from traditional automation, which usually assumes the page remains unchanged for the duration of a scripted task. It is also different from a chatbot that merely reports success. StateTrace treats human intervention as part of the workflow rather than as an error condition.

In the primary demo, the agent stages an address correction and the write fails. During the attempt, the person changes shipping to local pickup and locks it. The agent then reads the new revision, retries only the address transaction, preserves local pickup, verifies the final address and transaction status, and saves the episode as a regression fixture.

## How we implemented WebMCP

StateTrace is a React and TypeScript single-page application built around one deterministic transaction engine and a shared Zustand store. The human interface and all six WebMCP tools call that same engine; there is no hidden agent-only state.

The site registers imperative tools through `document.modelContext.registerTool`. Zod-backed schemas validate inputs again at execution time. Read tools serialize bounded semantic state and mark returned user content as untrusted where appropriate. Write tools enforce observed revisions, field locks, transaction eligibility, idempotency keys, and explicit failure behavior. Registration and execution support cancellation through `AbortSignal`.

The engine separates visible optimistic state from committed state, schedules deterministic effects, and appends actor-attributed events for every transition. A pure invariant engine verifies safety properties in code rather than asking a language model to judge whether the outcome looks correct. The replay engine restores a captured starting state and deterministically reruns its actions.

The interface includes failure controls for normal, slow, rejected, duplicate, and out-of-order delivery so the core workflow can be demonstrated without a backend or unreliable external service.

## Challenges we ran into

The hardest design problem was deciding what the agent should know without exposing an unbounded internal data dump. We kept each tool narrow and made the read operations bounded so the agent receives the transaction facts it needs without replacing the human interface or leaking arbitrary application state.

Another challenge was making concurrency understandable. Terms such as optimistic state, idempotency, and stale revisions are useful to engineers but abstract to everyone else. We grounded them in one visible story: an address change fails while the person chooses and locks a different shipping method.

Finally, recovery had to be deterministic. A generic “try again” action would weaken the whole idea, so retry operates on one identified failed transaction, requires the current revision, preserves human locks, and produces explicit evidence that can be verified and replayed.

## Accomplishments we are proud of

- Six non-trivial WebMCP tools operating over the same state as the UI.
- Human edits and locks remain authoritative during agent activity.
- Stale, locked, duplicated, invalid, and non-retryable writes fail safely.
- Agent, human, and system events remain visible and attributable.
- Seven deterministic invariants verify the transaction history and final state.
- Failure traces can be captured and replayed as regression fixtures.
- Chrome live testing confirms native registration of all six tools.
- The automated suite currently passes 28 tests across the engine, scheduler, store, UI, replay, invariants, and WebMCP contracts.

## What we learned

Agent-friendly websites need more than machine-readable buttons. They need machine-readable commitments: what is pending, what is final, what changed since the agent last looked, what the human has reserved, and how to prove the result.

We also learned that human control and agent capability do not have to be opposites. Giving the agent stronger semantic tools can make human intervention safer, because the agent no longer has to guess whether the interface changed or blindly repeat an operation.

## What's next

The next step is to extract the transaction protocol into a reusable library that applications can place around consequential WebMCP writes. We would add exportable fixtures, side-by-side comparisons with generic UI automation, configurable approval policies, and adapters for real support, commerce, travel, and operations workflows.

We would also measure tool-call accuracy, recovery success, token usage, and completion time against a baseline agent that can only inspect and manipulate the rendered interface.

## Suggested Devpost technology tags

WebMCP, React, TypeScript, Zustand, Zod, Vite, Vitest, Human-in-the-loop, Agentic Web, Reliability Engineering, Optimistic UI

## One-sentence closing

StateTrace shows a future where an agent does not merely operate a website—it collaborates inside the website's transaction model, while the person can intervene, preserve their decisions, and verify what truly happened.
