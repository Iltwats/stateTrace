import type { FailureMode, StateTraceState } from "../domain/types";
import { resolveTransaction } from "./transactionEngine";

type SchedulerAdapter = {
  getState: () => StateTraceState;
  setState: (state: StateTraceState) => void;
};

type ScheduledEffect = {
  transactionId: string;
  timeoutIds: number[];
};

const delays: Record<FailureMode, number> = {
  normal: 800,
  slow_next_write: 5_000,
  fail_next_write: 900,
  duplicate_response: 900,
  out_of_order: 1_600,
};

export function createEffectScheduler(adapter: SchedulerAdapter) {
  const scheduled = new Map<string, ScheduledEffect>();
  let outOfOrderCount = 0;

  function finish(transactionId: string, failureMode: FailureMode) {
    const current = adapter.getState();
    const next =
      failureMode === "fail_next_write"
        ? resolveTransaction(current, transactionId, {
            type: "fail",
            code: "SYNTHETIC_WRITE_FAILED",
            message: "The injected failure rejected this write.",
          })
        : resolveTransaction(current, transactionId, { type: "commit" });
    adapter.setState(next);

    if (failureMode === "duplicate_response") {
      const duplicateId = window.setTimeout(() => {
        adapter.setState(
          resolveTransaction(adapter.getState(), transactionId, { type: "commit" }),
        );
        scheduled.delete(transactionId);
      }, 120);
      const effect = scheduled.get(transactionId);
      if (effect) effect.timeoutIds.push(duplicateId);
      return;
    }

    scheduled.delete(transactionId);
  }

  return {
    schedule(transactionId: string, failureMode: FailureMode) {
      if (scheduled.has(transactionId)) return;

      let delay = delays[failureMode];
      if (failureMode === "out_of_order") {
        outOfOrderCount += 1;
        delay = outOfOrderCount % 2 === 0 ? 450 : 1_600;
      }

      const timeoutId = window.setTimeout(
        () => finish(transactionId, failureMode),
        delay,
      );
      scheduled.set(transactionId, { transactionId, timeoutIds: [timeoutId] });
    },

    cancel(transactionId: string) {
      const effect = scheduled.get(transactionId);
      if (!effect) return false;
      for (const timeoutId of effect.timeoutIds) window.clearTimeout(timeoutId);
      adapter.setState(
        resolveTransaction(adapter.getState(), transactionId, {
          type: "cancel",
        }),
      );
      scheduled.delete(transactionId);
      return true;
    },

    cancelAll() {
      for (const effect of scheduled.values()) {
        for (const timeoutId of effect.timeoutIds) window.clearTimeout(timeoutId);
      }
      scheduled.clear();
    },

    pendingIds() {
      return [...scheduled.keys()];
    },
  };
}

