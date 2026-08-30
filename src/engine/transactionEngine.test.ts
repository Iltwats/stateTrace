import { createBaselineState } from "../fixtures/baseline";
import {
  commitHumanChange,
  resolveTransaction,
  retryFailedTransaction,
  setFieldLock,
  stageOrderChange,
  TransactionEngineError,
  type EngineRuntime,
} from "./transactionEngine";

function createRuntime(): EngineRuntime {
  let id = 0;
  let now = 1_000;
  return {
    id: () => `test-${++id}`,
    now: () => ++now,
  };
}

function stageAddress(runtime: EngineRuntime) {
  const state = createBaselineState();
  return stageOrderChange(
    state,
    {
      field: "shippingAddress",
      value: "44 River Road, Portland, OR 97209",
      expectedRevision: state.committedRevision,
      idempotencyKey: "address-change-1",
      reason: "Customer requested a corrected address.",
    },
    runtime,
  );
}

describe("transaction engine", () => {
  it("keeps optimistic and committed state separate until resolution", () => {
    const runtime = createRuntime();
    const { state, transaction } = stageAddress(runtime);

    expect(state.visibleOrder.shippingAddress).toContain("44 River Road");
    expect(state.order.shippingAddress).toContain("18 Cedar Lane");
    expect(transaction.status).toBe("pending");
    expect(state.committedRevision).toBe(1);
  });

  it("commits a pending transaction and increments revision once", () => {
    const runtime = createRuntime();
    const staged = stageAddress(runtime);
    const committed = resolveTransaction(
      staged.state,
      staged.transaction.id,
      { type: "commit" },
      runtime,
    );

    expect(committed.order.shippingAddress).toContain("44 River Road");
    expect(committed.visibleOrder).toEqual(committed.order);
    expect(committed.committedRevision).toBe(2);
    expect(committed.transactions[0].status).toBe("committed");
  });

  it("rolls visible state back when a write fails", () => {
    const runtime = createRuntime();
    const staged = stageAddress(runtime);
    const failed = resolveTransaction(
      staged.state,
      staged.transaction.id,
      { type: "fail" },
      runtime,
    );

    expect(failed.order.shippingAddress).toContain("18 Cedar Lane");
    expect(failed.visibleOrder).toEqual(failed.order);
    expect(failed.transactions[0].status).toBe("failed");
    expect(failed.committedRevision).toBe(1);
  });

  it("preserves an unrelated human edit while retrying a failed transaction", () => {
    const runtime = createRuntime();
    const staged = stageAddress(runtime);
    const humanEdited = commitHumanChange(
      staged.state,
      "shippingMethod",
      "pickup",
      runtime,
    );
    const locked = setFieldLock(
      humanEdited,
      "shippingMethod",
      true,
      runtime,
    );
    const failed = resolveTransaction(
      locked,
      staged.transaction.id,
      { type: "fail" },
      runtime,
    );
    const retry = retryFailedTransaction(
      failed,
      staged.transaction.id,
      failed.committedRevision,
      "address-retry-1",
      runtime,
    );
    const recovered = resolveTransaction(
      retry.state,
      retry.transaction.id,
      { type: "commit" },
      runtime,
    );

    expect(recovered.order.shippingAddress).toContain("44 River Road");
    expect(recovered.order.shippingMethod).toBe("pickup");
    expect(recovered.lockedFields).toContain("shippingMethod");
    expect(retry.transaction.parentTransactionId).toBe(staged.transaction.id);
  });

  it("supersedes a pending write when the same field changes", () => {
    const runtime = createRuntime();
    const staged = stageAddress(runtime);
    const humanEdited = commitHumanChange(
      staged.state,
      "shippingAddress",
      "99 Human Way, Portland, OR 97201",
      runtime,
    );
    const resolved = resolveTransaction(
      humanEdited,
      staged.transaction.id,
      { type: "commit" },
      runtime,
    );

    expect(resolved.order.shippingAddress).toContain("99 Human Way");
    expect(resolved.transactions[0].status).toBe("superseded");
    expect(resolved.transactions[0].errorCode).toBe("FIELD_CONFLICT");
  });

  it("does not commit a field that becomes locked while pending", () => {
    const runtime = createRuntime();
    const staged = stageAddress(runtime);
    const locked = setFieldLock(
      staged.state,
      "shippingAddress",
      true,
      runtime,
    );
    const resolved = resolveTransaction(
      locked,
      staged.transaction.id,
      { type: "commit" },
      runtime,
    );

    expect(resolved.order.shippingAddress).toContain("18 Cedar Lane");
    expect(resolved.transactions[0].status).toBe("superseded");
    expect(resolved.transactions[0].errorCode).toBe("FIELD_LOCKED");
  });

  it("ignores a duplicate completion without incrementing revision twice", () => {
    const runtime = createRuntime();
    const staged = stageAddress(runtime);
    const committed = resolveTransaction(
      staged.state,
      staged.transaction.id,
      { type: "commit" },
      runtime,
    );
    const duplicate = resolveTransaction(
      committed,
      staged.transaction.id,
      { type: "commit" },
      runtime,
    );

    expect(duplicate.committedRevision).toBe(2);
    expect(duplicate.events.at(-1)?.type).toBe("duplicate_ignored");
  });

  it("rejects a stale revision before staging", () => {
    const runtime = createRuntime();
    const state = commitHumanChange(
      createBaselineState(),
      "shippingMethod",
      "pickup",
      runtime,
    );

    expect(() =>
      stageOrderChange(
        state,
        {
          field: "shippingAddress",
          value: "44 River Road, Portland, OR 97209",
          expectedRevision: 1,
          idempotencyKey: "stale-write",
          reason: "Stale test.",
        },
        runtime,
      ),
    ).toThrowError(TransactionEngineError);
  });

  it("rejects writes to a locked field", () => {
    const runtime = createRuntime();
    const state = setFieldLock(
      createBaselineState(),
      "shippingMethod",
      true,
      runtime,
    );

    expect(() =>
      stageOrderChange(
        state,
        {
          field: "shippingMethod",
          value: "express",
          expectedRevision: state.committedRevision,
          idempotencyKey: "locked-write",
          reason: "Locked test.",
        },
        runtime,
      ),
    ).toThrowError(/locked by the user/i);
  });

  it("rejects duplicate idempotency keys", () => {
    const runtime = createRuntime();
    const staged = stageAddress(runtime);

    expect(() =>
      stageOrderChange(
        staged.state,
        {
          field: "internalNote",
          value: "A new note",
          expectedRevision: staged.state.committedRevision,
          idempotencyKey: "address-change-1",
          reason: "Duplicate key test.",
        },
        runtime,
      ),
    ).toThrowError(/already belongs/i);
  });
});

