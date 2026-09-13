import { create } from "zustand";
import type {
  Actor,
  FailureMode,
  FieldValue,
  FormCheckpoint,
  MutableField,
  RegressionFixture,
  StateTraceState,
  Transaction,
} from "../domain/types";
import { createEffectScheduler } from "../engine/effectScheduler";
import { replayRegressionFixture } from "../engine/replayEngine";
import {
  commitHumanChange,
  retryFailedTransaction,
  setFailureMode,
  setFieldLock,
  saveRegressionFixture,
  stageOrderChange,
  TransactionEngineError,
} from "../engine/transactionEngine";
import { baselineOrder, createBaselineState } from "../fixtures/baseline";

type StageRequest = {
  field: MutableField;
  value: FieldValue;
  expectedRevision?: number;
  idempotencyKey?: string;
  reason: string;
  actor?: Actor;
};

type StateTraceStore = {
  state: StateTraceState;
  lastError: { code: string; message: string } | null;
  stageChange: (request: StageRequest) => Transaction | null;
  retryTransaction: (
    transactionId: string,
    expectedRevision?: number,
    idempotencyKey?: string,
  ) => Transaction | null;
  commitHumanField: (field: MutableField, value: FieldValue) => boolean;
  toggleFieldLock: (field: MutableField) => void;
  chooseFailureMode: (mode: FailureMode) => void;
  cancelTransaction: (transactionId: string) => boolean;
  saveFixture: (input: {
    name: string;
    description: string;
    expectedOutcome: RegressionFixture["expectedOutcome"];
  }) => RegressionFixture | null;
  replayFixture: (fixtureId: string) => boolean;
  restoreCheckpoint: (fixtureId: string) => boolean;
  clearError: () => void;
  reset: () => void;
};

const mutableFields: MutableField[] = [
  "customerEmail",
  "shippingAddress",
  "shippingMethod",
  "couponCode",
  "paymentName",
  "internalNote",
];

const fieldLabels: Record<MutableField, string> = {
  customerEmail: "contact email",
  shippingAddress: "shipping address",
  shippingMethod: "delivery method",
  couponCode: "discount code",
  paymentName: "name on card",
  internalNote: "delivery instructions",
};

function addAutomaticCheckpoint(
  currentState: StateTraceState,
  description: string,
): StateTraceState {
  const state = structuredClone(currentState);
  const checkpoint: FormCheckpoint = {
    id: crypto.randomUUID(),
    name: `Automatic checkpoint ${state.checkpoints.length + 1}`,
    description,
    createdAt: Date.now(),
    revision: state.committedRevision,
    order: structuredClone(state.order),
  };
  state.checkpoints.push(checkpoint);
  return state;
}

function toError(error: unknown) {
  if (error instanceof TransactionEngineError) {
    return { code: error.code, message: error.message };
  }

  return {
    code: "UNEXPECTED_ERROR",
    message: error instanceof Error ? error.message : "An unexpected error occurred.",
  };
}

function makeIdempotencyKey(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export const useStateTraceStore = create<StateTraceStore>((set, get) => {
  const scheduler = createEffectScheduler({
    getState: () => get().state,
    setState: (state) => set({ state }),
  });

  function schedule(transaction: Transaction, mode: FailureMode) {
    scheduler.schedule(transaction.id, mode);
  }

  return {
    state: createBaselineState(),
    lastError: null,

    stageChange(request) {
      try {
        const current = get().state;
        const mode = current.failureMode;
        const actor = request.actor ?? "agent";
        const checkpointed = addAutomaticCheckpoint(
          current,
          `Before ${actor === "human" ? "you" : "the agent"} changed the ${fieldLabels[request.field]}.`,
        );
        const staged = stageOrderChange(checkpointed, {
          field: request.field,
          value: request.value,
          expectedRevision:
            request.expectedRevision ?? current.committedRevision,
          idempotencyKey:
            request.idempotencyKey ?? makeIdempotencyKey(request.field),
          reason: request.reason,
          actor,
        });

        if (mode !== "normal") staged.state.failureMode = "normal";
        set({ state: staged.state, lastError: null });
        schedule(staged.transaction, mode);
        return staged.transaction;
      } catch (error) {
        set({ lastError: toError(error) });
        return null;
      }
    },

    retryTransaction(transactionId, expectedRevision, idempotencyKey) {
      try {
        const current = get().state;
        const mode = current.failureMode;
        const original = current.transactions.find(
          (transaction) => transaction.id === transactionId,
        );
        const checkpointed = addAutomaticCheckpoint(
          current,
          `Before the agent retried the ${
            original ? fieldLabels[original.mutation.field] : "checkout update"
          }.`,
        );
        const retried = retryFailedTransaction(
          checkpointed,
          transactionId,
          expectedRevision ?? current.committedRevision,
          idempotencyKey ?? makeIdempotencyKey("retry"),
        );
        if (mode !== "normal") retried.state.failureMode = "normal";
        set({ state: retried.state, lastError: null });
        schedule(retried.transaction, mode);
        return retried.transaction;
      } catch (error) {
        set({ lastError: toError(error) });
        return null;
      }
    },

    commitHumanField(field, value) {
      try {
        const checkpointed = addAutomaticCheckpoint(
          get().state,
          `Before you changed the ${fieldLabels[field]}.`,
        );
        set({
          state: commitHumanChange(checkpointed, field, value),
          lastError: null,
        });
        return true;
      } catch (error) {
        set({ lastError: toError(error) });
        return false;
      }
    },

    toggleFieldLock(field) {
      const current = get().state;
      set({
        state: setFieldLock(
          current,
          field,
          !current.lockedFields.includes(field),
        ),
        lastError: null,
      });
    },

    chooseFailureMode(mode) {
      set({ state: setFailureMode(get().state, mode), lastError: null });
    },

    cancelTransaction(transactionId) {
      const cancelled = scheduler.cancel(transactionId);
      if (!cancelled) {
        set({
          lastError: {
            code: "EFFECT_NOT_SCHEDULED",
            message: `Transaction ${transactionId} does not have a cancellable effect.`,
          },
        });
      }
      return cancelled;
    },

    saveFixture(input) {
      try {
        const saved = saveRegressionFixture(get().state, {
          ...input,
          startingOrder: baselineOrder,
        });
        set({ state: saved.state, lastError: null });
        return saved.fixture;
      } catch (error) {
        set({ lastError: toError(error) });
        return null;
      }
    },

    replayFixture(fixtureId) {
      try {
        const current = get().state;
        const fixture = current.savedFixtures.find(({ id }) => id === fixtureId);
        if (!fixture) {
          throw new TransactionEngineError(
            "FIXTURE_NOT_FOUND",
            `Regression fixture ${fixtureId} does not exist.`,
          );
        }
        scheduler.cancelAll();
        const replayed = replayRegressionFixture(fixture);
        replayed.savedFixtures = structuredClone(current.savedFixtures);
        replayed.checkpoints = structuredClone(current.checkpoints);
        set({ state: replayed, lastError: null });
        return true;
      } catch (error) {
        set({ lastError: toError(error) });
        return false;
      }
    },

    restoreCheckpoint(fixtureId) {
      try {
        const checkpoint = get().state.checkpoints.find(
          ({ id }) => id === fixtureId,
        );
        if (!checkpoint) {
          throw new TransactionEngineError(
            "FIXTURE_NOT_FOUND",
            `Checkpoint ${fixtureId} does not exist.`,
          );
        }

        for (const transactionId of scheduler.pendingIds()) {
          scheduler.cancel(transactionId);
        }

        let restored = structuredClone(get().state);
        const changedFields = mutableFields.filter(
          (field) => restored.order[field] !== checkpoint.order[field],
        );
        if (changedFields.length === 0) {
          set({ lastError: null });
          return true;
        }

        restored = addAutomaticCheckpoint(
          restored,
          `Before you restored ${checkpoint.name.toLowerCase()}.`,
        );
        const currentLocks = restored.lockedFields;
        restored.lockedFields = [];

        for (const field of changedFields) {
          restored = commitHumanChange(restored, field, checkpoint.order[field]);
        }

        restored.lockedFields = currentLocks;
        set({ state: restored, lastError: null });
        return true;
      } catch (error) {
        set({ lastError: toError(error) });
        return false;
      }
    },

    clearError() {
      set({ lastError: null });
    },

    reset() {
      scheduler.cancelAll();
      set({ state: createBaselineState(), lastError: null });
    },
  };
});
