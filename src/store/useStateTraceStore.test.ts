import { useStateTraceStore } from "./useStateTraceStore";

describe("StateTrace shared store", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useStateTraceStore.getState().reset();
  });

  afterEach(() => {
    useStateTraceStore.getState().reset();
    vi.useRealTimers();
  });

  it("runs the primary failure, human intervention, and recovery workflow", () => {
    const store = useStateTraceStore.getState();
    store.chooseFailureMode("fail_next_write");
    const staged = store.stageChange({
      field: "shippingAddress",
      value: "44 River Road, Portland, OR 97209",
      idempotencyKey: "store-address-1",
      reason: "Correct the delivery address.",
    });

    expect(staged).not.toBeNull();
    expect(useStateTraceStore.getState().state.visibleOrder.shippingAddress).toContain(
      "44 River Road",
    );

    useStateTraceStore
      .getState()
      .commitHumanField("shippingMethod", "pickup");
    useStateTraceStore.getState().toggleFieldLock("shippingMethod");
    vi.advanceTimersByTime(900);

    const failedState = useStateTraceStore.getState().state;
    expect(failedState.transactions[0].status).toBe("failed");
    expect(failedState.order.shippingMethod).toBe("pickup");
    expect(failedState.lockedFields).toContain("shippingMethod");

    const retry = useStateTraceStore
      .getState()
      .retryTransaction(staged!.id, undefined, "store-retry-1");
    expect(retry).not.toBeNull();
    vi.advanceTimersByTime(800);

    const recovered = useStateTraceStore.getState().state;
    expect(recovered.order.shippingAddress).toContain("44 River Road");
    expect(recovered.order.shippingMethod).toBe("pickup");
    expect(recovered.transactions.at(-1)?.status).toBe("committed");
  });

  it("cancels a pending effect and restores committed state", () => {
    const store = useStateTraceStore.getState();
    store.chooseFailureMode("slow_next_write");
    const staged = store.stageChange({
      field: "internalNote",
      value: "Optimistic note",
      idempotencyKey: "slow-note-1",
      reason: "Test cancellation.",
    });

    expect(staged).not.toBeNull();
    expect(useStateTraceStore.getState().cancelTransaction(staged!.id)).toBe(true);

    const state = useStateTraceStore.getState().state;
    expect(state.transactions[0].status).toBe("cancelled");
    expect(state.visibleOrder).toEqual(state.order);
  });

  it("restores a checkpoint without erasing the activity history", () => {
    useStateTraceStore.getState().commitHumanField("couponCode", "SHIPFREE");
    const checkpoint = useStateTraceStore.getState().state.checkpoints[0];

    const restored = useStateTraceStore
      .getState()
      .restoreCheckpoint(checkpoint.id);
    const state = useStateTraceStore.getState().state;
    const couponChanges = state.events.filter(
      (event) =>
        event.type === "human_change_committed" &&
        event.payload.field === "couponCode",
    );

    expect(restored).toBe(true);
    expect(state.order.couponCode).toBe("WELCOME10");
    expect(state.checkpoints).toHaveLength(2);
    expect(couponChanges).toHaveLength(2);
    expect(couponChanges.at(-1)?.payload).toMatchObject({
      previousValue: "SHIPFREE",
      nextValue: "WELCOME10",
    });
  });
});
