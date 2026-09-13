import { createBaselineState } from "../fixtures/baseline";
import { verifyInvariants } from "./invariantEngine";
import { resolveTransaction, stageOrderChange, type EngineRuntime } from "./transactionEngine";

const runtime: EngineRuntime = {
  now: (() => {
    let value = 100;
    return () => ++value;
  })(),
  id: (() => {
    let value = 0;
    return () => `invariant-${++value}`;
  })(),
};

describe("invariant engine", () => {
  it("passes all hard invariants for a valid committed flow", () => {
    const baseline = createBaselineState();
    const staged = stageOrderChange(
      baseline,
      {
        field: "internalNote",
        value: "Verified by the operations team.",
        expectedRevision: baseline.committedRevision,
        idempotencyKey: "note-1",
        reason: "Add verified note.",
      },
      runtime,
    );
    const committed = resolveTransaction(
      staged.state,
      staged.transaction.id,
      { type: "commit" },
      runtime,
    );

    expect(verifyInvariants(committed).every(({ passed }) => passed)).toBe(true);
  });

  it("detects visible state divergence when no effects are pending", () => {
    const corrupted = createBaselineState();
    corrupted.visibleOrder.shippingAddress = "Corrupted visible value";

    const check = verifyInvariants(corrupted).find(({ id }) => id === "visible-settled");
    expect(check?.passed).toBe(false);
  });

  it("detects a gap in trace sequence", () => {
    const baseline = createBaselineState();
    const staged = stageOrderChange(
      baseline,
      {
        field: "internalNote",
        value: "Trace test",
        expectedRevision: baseline.committedRevision,
        idempotencyKey: "note-2",
        reason: "Trace sequence test.",
      },
      runtime,
    );
    staged.state.events[1].sequence = 99;

    const check = verifyInvariants(staged.state).find(({ id }) => id === "event-sequence");
    expect(check?.passed).toBe(false);
  });
});
