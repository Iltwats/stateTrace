import type { MutableField, TransactionStatus } from "../domain/types";
import { verifyInvariants } from "../engine/invariantEngine";
import { useStateTraceStore } from "../store/useStateTraceStore";
import {
  getTransactionStateInput,
  inputSchemas,
  listTransactionEventsInput,
  parseToolInput,
  retryFailedTransactionInput,
  saveRegressionFixtureInput,
  stageOrderChangeInput,
  verifyTransactionStateInput,
} from "./schemas";
import { serializeEvent, serializeTransactionState } from "./serializers";

export const stateTraceToolNames = [
  "get_transaction_state",
  "list_transaction_events",
  "verify_transaction_state",
  "stage_order_change",
  "retry_failed_transaction",
  "save_regression_fixture",
] as const;

export type WebMCPRegistration = {
  supported: boolean;
  registeredToolNames: string[];
  cleanup: () => void;
  error?: string;
};

let activeController: AbortController | null = null;

function ensureNotCancelled(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException("Tool call cancelled", "AbortError");
  }
}

function storeError() {
  const error = useStateTraceStore.getState().lastError;
  if (!error) return new Error("StateTrace could not complete the operation.");
  return new Error(`${error.code}: ${error.message}`);
}

function createTools(): WebMCP.ModelContextTool[] {
  return [
    {
      name: "get_transaction_state",
      title: "Get transaction state",
      description:
        "Read the current committed order revision, optimistic differences, locks, pending effects, failed effects, and verification summary shared with the user.",
      inputSchema: inputSchemas.getTransactionState,
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async (input, options) => {
        const signal = options?.signal;
        ensureNotCancelled(signal);
        const parsed = parseToolInput(getTransactionStateInput, input);
        return serializeTransactionState(
          useStateTraceStore.getState().state,
          parsed.includeRecentEvents,
        );
      },
    },
    {
      name: "list_transaction_events",
      title: "List transaction events",
      description:
        "Inspect a bounded ordered section of the visible StateTrace event history when diagnosing a pending, failed, superseded, or committed transaction.",
      inputSchema: inputSchemas.listTransactionEvents,
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async (input, options) => {
        const signal = options?.signal;
        ensureNotCancelled(signal);
        const parsed = parseToolInput(listTransactionEventsInput, input);
        const state = useStateTraceStore.getState().state;
        let events = state.events;

        if (parsed.afterSequence !== undefined) {
          events = events.filter(
            ({ sequence }) => sequence > parsed.afterSequence!,
          );
        }
        if (parsed.transactionId) {
          events = events.filter(
            ({ transactionId }) => transactionId === parsed.transactionId,
          );
        }
        if (parsed.status) {
          const ids = new Set(
            state.transactions
              .filter(({ status }) => status === parsed.status)
              .map(({ id }) => id),
          );
          events = events.filter(
            ({ transactionId }) => transactionId && ids.has(transactionId),
          );
        }

        return {
          orderId: state.order.id,
          committedRevision: state.committedRevision,
          events: events.slice(0, parsed.limit).map(serializeEvent),
          returned: Math.min(events.length, parsed.limit),
          totalMatching: events.length,
        };
      },
    },
    {
      name: "verify_transaction_state",
      title: "Verify transaction state",
      description:
        "Run deterministic StateTrace invariants and optional exact postconditions after an order workflow without changing application state.",
      inputSchema: inputSchemas.verifyTransactionState,
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async (input, options) => {
        const signal = options?.signal;
        ensureNotCancelled(signal);
        const parsed = parseToolInput(verifyTransactionStateInput, input);
        const state = useStateTraceStore.getState().state;
        const invariantChecks = verifyInvariants(state);
        const postconditions: Array<{
          id: string;
          passed: boolean;
          expected: unknown;
          actual: unknown;
        }> = [];

        if (parsed.expectedRevision !== undefined) {
          postconditions.push({
            id: "expected-revision",
            passed: state.committedRevision === parsed.expectedRevision,
            expected: parsed.expectedRevision,
            actual: state.committedRevision,
          });
        }
        if (parsed.expectedFields) {
          for (const [field, expected] of Object.entries(
            parsed.expectedFields,
          ) as Array<[MutableField, string]>) {
            postconditions.push({
              id: `field-${field}`,
              passed: state.order[field] === expected,
              expected,
              actual: state.order[field],
            });
          }
        }
        if (parsed.transactionId) {
          const transaction = state.transactions.find(
            ({ id }) => id === parsed.transactionId,
          );
          postconditions.push({
            id: "transaction-status",
            passed:
              transaction !== undefined &&
              (parsed.expectedTransactionStatus === undefined ||
                transaction.status === parsed.expectedTransactionStatus),
            expected: parsed.expectedTransactionStatus ?? "transaction exists",
            actual: transaction?.status ?? "not_found",
          });
        }

        return {
          orderId: state.order.id,
          committedRevision: state.committedRevision,
          passed:
            invariantChecks.every(({ passed }) => passed) &&
            postconditions.every(({ passed }) => passed),
          invariants: invariantChecks,
          postconditions,
        };
      },
    },
    {
      name: "stage_order_change",
      title: "Stage order change",
      description:
        "Stage one validated optimistic change to an observable checkout field at an observed revision and show it in the human-visible activity trace.",
      inputSchema: inputSchemas.stageOrderChange,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (input, options) => {
        const signal = options?.signal;
        ensureNotCancelled(signal);
        const parsed = parseToolInput(stageOrderChangeInput, input);
        const transaction = useStateTraceStore.getState().stageChange({
          ...parsed,
          actor: "agent",
        });
        if (!transaction) throw storeError();
        ensureNotCancelled(signal);
        return {
          ok: true,
          transactionId: transaction.id,
          status: transaction.status,
          field: transaction.mutation.field,
          baseRevision: transaction.baseRevision,
          attempt: transaction.attempt,
          visibleStateUpdated: true,
        };
      },
    },
    {
      name: "retry_failed_transaction",
      title: "Retry failed transaction",
      description:
        "Retry one failed or superseded StateTrace transaction at the current observed revision while preserving newer human edits and field locks.",
      inputSchema: inputSchemas.retryFailedTransaction,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (input, options) => {
        const signal = options?.signal;
        ensureNotCancelled(signal);
        const parsed = parseToolInput(retryFailedTransactionInput, input);
        const transaction = useStateTraceStore
          .getState()
          .retryTransaction(
            parsed.transactionId,
            parsed.expectedRevision,
            parsed.idempotencyKey,
          );
        if (!transaction) throw storeError();
        ensureNotCancelled(signal);
        return {
          ok: true,
          transactionId: transaction.id,
          parentTransactionId: transaction.parentTransactionId,
          status: transaction.status,
          field: transaction.mutation.field,
          baseRevision: transaction.baseRevision,
          attempt: transaction.attempt,
          visibleStateUpdated: true,
        };
      },
    },
    {
      name: "save_regression_fixture",
      title: "Save regression fixture",
      description:
        "Save the current visible trace as a local deterministic regression fixture after diagnosing or recovering a transaction failure.",
      inputSchema: inputSchemas.saveRegressionFixture,
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: async (input, options) => {
        const signal = options?.signal;
        ensureNotCancelled(signal);
        const parsed = parseToolInput(saveRegressionFixtureInput, input);
        const fixture = useStateTraceStore.getState().saveFixture(parsed);
        if (!fixture) throw storeError();
        ensureNotCancelled(signal);
        return {
          ok: true,
          fixtureId: fixture.id,
          name: fixture.name,
          expectedOutcome: fixture.expectedOutcome,
          capturedEvents: fixture.events.length,
          visibleStateUpdated: true,
        };
      },
    },
  ];
}

export async function registerStateTraceTools(
  modelContext: WebMCP.ModelContext | undefined = document.modelContext,
): Promise<WebMCPRegistration> {
  activeController?.abort();

  if (!modelContext || typeof modelContext.registerTool !== "function") {
    return {
      supported: false,
      registeredToolNames: [],
      cleanup: () => {},
    };
  }

  const controller = new AbortController();
  activeController = controller;
  const registeredToolNames: string[] = [];

  try {
    for (const tool of createTools()) {
      await modelContext.registerTool(tool, { signal: controller.signal });
      registeredToolNames.push(tool.name);
    }

    return {
      supported: true,
      registeredToolNames,
      cleanup: () => {
        controller.abort();
        if (activeController === controller) activeController = null;
      },
    };
  } catch (error) {
    controller.abort();
    if (activeController === controller) activeController = null;
    return {
      supported: false,
      registeredToolNames,
      cleanup: () => {},
      error: error instanceof Error ? error.message : "Tool registration failed.",
    };
  }
}

export function getTransactionStatus(
  transactionId: string,
): TransactionStatus | "not_found" {
  return (
    useStateTraceStore
      .getState()
      .state.transactions.find(({ id }) => id === transactionId)?.status ??
    "not_found"
  );
}
