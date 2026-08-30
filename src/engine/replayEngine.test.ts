import { baselineOrder, createBaselineState } from "../fixtures/baseline";
import { verifyInvariants } from "./invariantEngine";
import { replayRegressionFixture } from "./replayEngine";
import {
  commitHumanChange,
  resolveTransaction,
  saveRegressionFixture,
  setFieldLock,
  stageOrderChange,
  type EngineRuntime,
} from "./transactionEngine";

function createRuntime(prefix: string): EngineRuntime {
  let id = 0;
  let time = 100;
  return {
    id: () => `${prefix}-${++id}`,
    now: () => ++time,
  };
}

describe("regression replay", () => {
  it("replays a recovered transaction while preserving a human lock", () => {
    const runtime = createRuntime("source");
    const baseline = createBaselineState();
    const staged = stageOrderChange(
      baseline,
      {
        field: "shippingAddress",
        value: "44 River Road, Portland, OR 97209",
        expectedRevision: 1,
        idempotencyKey: "source-address",
        reason: "Correct address.",
      },
      runtime,
    );
    let state = commitHumanChange(
      staged.state,
      "shippingMethod",
      "pickup",
      runtime,
    );
    state = setFieldLock(state, "shippingMethod", true, runtime);
    state = resolveTransaction(
      state,
      staged.transaction.id,
      { type: "commit" },
      runtime,
    );
    const saved = saveRegressionFixture(
      state,
      {
        name: "Concurrent shipping lock",
        description: "Address commits while a newer shipping choice stays locked.",
        expectedOutcome: "recovered",
        startingOrder: baselineOrder,
      },
      runtime,
    );

    const replayed = replayRegressionFixture(
      saved.fixture,
      createRuntime("replay"),
    );

    expect(replayed.order.shippingAddress).toContain("44 River Road");
    expect(replayed.order.shippingMethod).toBe("pickup");
    expect(replayed.lockedFields).toContain("shippingMethod");
    expect(verifyInvariants(replayed).every(({ passed }) => passed)).toBe(true);
  });
});

