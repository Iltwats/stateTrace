import { createBaselineState } from "../fixtures/baseline";
import { createEffectScheduler } from "./effectScheduler";
import { stageOrderChange } from "./transactionEngine";

describe("effect scheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("commits a normal scheduled effect", () => {
    const baseline = createBaselineState();
    const staged = stageOrderChange(baseline, {
      field: "shippingMethod",
      value: "express",
      expectedRevision: baseline.committedRevision,
      idempotencyKey: "scheduler-normal",
      reason: "Scheduler test.",
    });
    let state = staged.state;
    const scheduler = createEffectScheduler({
      getState: () => state,
      setState: (next) => {
        state = next;
      },
    });

    scheduler.schedule(staged.transaction.id, "normal");
    vi.advanceTimersByTime(800);

    expect(state.order.shippingMethod).toBe("express");
    expect(state.transactions[0].status).toBe("committed");
  });

  it("fails an injected write and restores visible state", () => {
    const baseline = createBaselineState();
    const staged = stageOrderChange(baseline, {
      field: "shippingMethod",
      value: "pickup",
      expectedRevision: baseline.committedRevision,
      idempotencyKey: "scheduler-fail",
      reason: "Scheduler failure test.",
    });
    let state = staged.state;
    const scheduler = createEffectScheduler({
      getState: () => state,
      setState: (next) => {
        state = next;
      },
    });

    scheduler.schedule(staged.transaction.id, "fail_next_write");
    vi.advanceTimersByTime(900);

    expect(state.order.shippingMethod).toBe("standard");
    expect(state.visibleOrder.shippingMethod).toBe("standard");
    expect(state.transactions[0].status).toBe("failed");
  });
});

