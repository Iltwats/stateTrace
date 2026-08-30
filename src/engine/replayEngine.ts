import type {
  Actor,
  FailureMode,
  MutableField,
  RegressionFixture,
  StateTraceState,
} from "../domain/types";
import { createBaselineState } from "../fixtures/baseline";
import { verifyInvariants } from "./invariantEngine";
import {
  commitHumanChange,
  resolveTransaction,
  setFailureMode,
  setFieldLock,
  stageOrderChange,
  type EngineRuntime,
} from "./transactionEngine";

const replayRuntime: EngineRuntime = {
  now: () => Date.now(),
  id: () => crypto.randomUUID(),
};

function stringPayload(value: unknown, name: string) {
  if (typeof value !== "string" || !value) {
    throw new Error(`Regression fixture is missing ${name}.`);
  }
  return value;
}

export function replayRegressionFixture(
  fixture: RegressionFixture,
  runtime: EngineRuntime = replayRuntime,
): StateTraceState {
  let state = createBaselineState();
  state.order = structuredClone(fixture.startingOrder);
  state.visibleOrder = structuredClone(fixture.startingOrder);
  state.savedFixtures = [];
  const transactionIdMap = new Map<string, string>();

  for (const event of fixture.events) {
    const field = event.payload.field as MutableField | undefined;

    switch (event.type) {
      case "failure_mode_changed":
        state = setFailureMode(
          state,
          stringPayload(event.payload.failureMode, "failure mode") as FailureMode,
          runtime,
        );
        break;

      case "human_change_committed":
        if (!field) throw new Error("Regression fixture is missing a human field.");
        state = commitHumanChange(
          state,
          field,
          stringPayload(event.payload.nextValue, "human value"),
          runtime,
        );
        break;

      case "field_locked":
      case "field_unlocked":
        if (!field) throw new Error("Regression fixture is missing a lock field.");
        state = setFieldLock(
          state,
          field,
          event.type === "field_locked",
          runtime,
        );
        break;

      case "optimistic_applied": {
        if (!field || !event.transactionId) {
          throw new Error("Regression fixture has an incomplete optimistic event.");
        }
        const created = fixture.events.find(
          (candidate) =>
            candidate.type === "transaction_created" &&
            candidate.transactionId === event.transactionId,
        );
        const staged = stageOrderChange(
          state,
          {
            field,
            value: stringPayload(event.payload.value, "optimistic value"),
            expectedRevision: state.committedRevision,
            idempotencyKey: `replay-${event.transactionId}`,
            reason: `Replay of ${fixture.name}`,
            actor: (created?.actor ?? "agent") as Actor,
            attempt:
              typeof created?.payload.attempt === "number"
                ? created.payload.attempt
                : 1,
          },
          runtime,
        );
        state = staged.state;
        transactionIdMap.set(event.transactionId, staged.transaction.id);
        break;
      }

      case "effect_committed":
      case "effect_superseded":
      case "effect_failed":
      case "effect_cancelled":
      case "duplicate_ignored": {
        if (!event.transactionId) break;
        const replayId = transactionIdMap.get(event.transactionId);
        if (!replayId) break;

        if (event.type === "effect_failed") {
          state = resolveTransaction(
            state,
            replayId,
            {
              type: "fail",
              code:
                typeof event.payload.code === "string"
                  ? event.payload.code
                  : undefined,
              message:
                typeof event.payload.message === "string"
                  ? event.payload.message
                  : undefined,
            },
            runtime,
          );
        } else if (event.type === "effect_cancelled") {
          state = resolveTransaction(
            state,
            replayId,
            { type: "cancel" },
            runtime,
          );
        } else {
          state = resolveTransaction(
            state,
            replayId,
            { type: "commit" },
            runtime,
          );
        }
        break;
      }

      default:
        break;
    }
  }

  const checks = verifyInvariants(state);
  if (!checks.every(({ passed }) => passed)) {
    throw new Error("Replayed fixture produced an invalid final state.");
  }

  return state;
}

