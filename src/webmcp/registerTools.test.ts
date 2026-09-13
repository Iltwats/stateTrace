import { useStateTraceStore } from "../store/useStateTraceStore";
import {
  registerStateTraceTools,
  stateTraceToolNames,
} from "./registerTools";

class FakeModelContext {
  readonly tools = new Map<string, WebMCP.ModelContextTool>();

  async registerTool(
    tool: WebMCP.ModelContextTool,
    options?: WebMCP.ModelContextRegisterToolOptions,
  ) {
    if (this.tools.has(tool.name)) {
      throw new Error(`Duplicate tool: ${tool.name}`);
    }
    this.tools.set(tool.name, tool);
    options?.signal?.addEventListener(
      "abort",
      () => this.tools.delete(tool.name),
      { once: true },
    );
  }

  asModelContext() {
    return this as unknown as WebMCP.ModelContext;
  }
}

async function execute(
  context: FakeModelContext,
  name: string,
  input: Record<string, unknown>,
) {
  const tool = context.tools.get(name);
  if (!tool) throw new Error(`Missing registered tool ${name}`);
  return tool.execute(input, { signal: new AbortController().signal });
}

describe("StateTrace WebMCP tools", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useStateTraceStore.getState().reset();
  });

  afterEach(() => {
    useStateTraceStore.getState().reset();
    vi.useRealTimers();
  });

  it("registers six distinct tools with accurate read annotations", async () => {
    const context = new FakeModelContext();
    const registration = await registerStateTraceTools(context.asModelContext());

    expect(registration.supported).toBe(true);
    expect([...context.tools.keys()]).toEqual(stateTraceToolNames);
    expect(context.tools.get("get_transaction_state")?.annotations?.readOnlyHint).toBe(
      true,
    );
    expect(context.tools.get("stage_order_change")?.annotations?.readOnlyHint).toBe(
      false,
    );

    registration.cleanup();
    expect(context.tools.size).toBe(0);
  });

  it("returns bounded shared transaction state", async () => {
    const context = new FakeModelContext();
    const registration = await registerStateTraceTools(context.asModelContext());

    const result = (await execute(context, "get_transaction_state", {
      includeRecentEvents: true,
    })) as Record<string, unknown>;

    expect(result.orderId).toBe("ORD-2048");
    expect(result.committedRevision).toBe(1);
    expect(result.pendingTransactions).toEqual([]);
    registration.cleanup();
  });

  it("accepts hosts that omit the optional execution signal", async () => {
    const context = new FakeModelContext();
    const registration = await registerStateTraceTools(context.asModelContext());
    const tool = context.tools.get("get_transaction_state");

    if (!tool) throw new Error("Missing get_transaction_state tool");
    const result = (await (
      tool.execute as (input: Record<string, unknown>) => Promise<unknown>
    )({ includeRecentEvents: false })) as Record<string, unknown>;

    expect(result.orderId).toBe("ORD-2048");
    expect(result.committedRevision).toBe(1);
    registration.cleanup();
  });

  it("lists a bounded transaction event slice", async () => {
    const context = new FakeModelContext();
    const registration = await registerStateTraceTools(context.asModelContext());
    useStateTraceStore
      .getState()
      .commitHumanField("internalNote", "First trace event");
    useStateTraceStore
      .getState()
      .commitHumanField("shippingMethod", "express");

    const result = (await execute(context, "list_transaction_events", {
      afterSequence: 0,
      limit: 1,
    })) as {
      events: Array<{ sequence: number }>;
      returned: number;
      totalMatching: number;
    };

    expect(result.returned).toBe(1);
    expect(result.totalMatching).toBe(2);
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.sequence).toBe(1);
    registration.cleanup();
  });

  it("rejects unknown schema properties in executable validation", async () => {
    const context = new FakeModelContext();
    const registration = await registerStateTraceTools(context.asModelContext());

    await expect(
      execute(context, "get_transaction_state", { unexpected: true }),
    ).rejects.toThrow(/unrecognized key/i);
    registration.cleanup();
  });

  it("stages a visible agent write and verifies it after commit", async () => {
    const context = new FakeModelContext();
    const registration = await registerStateTraceTools(context.asModelContext());

    const stageResult = (await execute(context, "stage_order_change", {
      field: "shippingAddress",
      value: "44 River Road, Portland, OR 97209",
      expectedRevision: 1,
      idempotencyKey: "webmcp-address-1",
      reason: "Correct the customer delivery address.",
    })) as { transactionId: string; status: string };

    expect(stageResult.status).toBe("pending");
    expect(
      useStateTraceStore.getState().state.visibleOrder.shippingAddress,
    ).toContain("44 River Road");
    vi.advanceTimersByTime(800);

    const verification = (await execute(context, "verify_transaction_state", {
      expectedRevision: 2,
      expectedFields: {
        shippingAddress: "44 River Road, Portland, OR 97209",
      },
      transactionId: stageResult.transactionId,
      expectedTransactionStatus: "committed",
    })) as { passed: boolean };

    expect(verification.passed).toBe(true);
    expect(useStateTraceStore.getState().state.events[0].actor).toBe("agent");
    registration.cleanup();
  });

  it("retries only the failed transaction while preserving a human lock", async () => {
    const context = new FakeModelContext();
    const registration = await registerStateTraceTools(context.asModelContext());
    useStateTraceStore.getState().chooseFailureMode("fail_next_write");

    const staged = (await execute(context, "stage_order_change", {
      field: "shippingAddress",
      value: "44 River Road, Portland, OR 97209",
      expectedRevision: 1,
      idempotencyKey: "webmcp-fail-1",
      reason: "Correct the customer delivery address.",
    })) as { transactionId: string };

    useStateTraceStore
      .getState()
      .commitHumanField("shippingMethod", "pickup");
    useStateTraceStore.getState().toggleFieldLock("shippingMethod");
    vi.advanceTimersByTime(900);

    const revision = useStateTraceStore.getState().state.committedRevision;
    await execute(context, "retry_failed_transaction", {
      transactionId: staged.transactionId,
      expectedRevision: revision,
      idempotencyKey: "webmcp-retry-1",
    });
    vi.advanceTimersByTime(800);

    const state = useStateTraceStore.getState().state;
    expect(state.order.shippingAddress).toContain("44 River Road");
    expect(state.order.shippingMethod).toBe("pickup");
    expect(state.lockedFields).toContain("shippingMethod");
    registration.cleanup();
  });

  it("saves the current trace as a visible regression fixture", async () => {
    const context = new FakeModelContext();
    const registration = await registerStateTraceTools(context.asModelContext());
    useStateTraceStore
      .getState()
      .commitHumanField("internalNote", "Fixture source event");

    const saved = (await execute(context, "save_regression_fixture", {
      name: "Human note edit",
      description: "Preserve a directly committed human note change.",
      expectedOutcome: "recovered",
    })) as { fixtureId: string; capturedEvents: number };

    expect(saved.fixtureId).toBeTruthy();
    expect(saved.capturedEvents).toBe(1);
    expect(useStateTraceStore.getState().state.savedFixtures).toHaveLength(1);
    expect(useStateTraceStore.getState().state.events.at(-1)?.type).toBe(
      "fixture_saved",
    );
    registration.cleanup();
  });
});
