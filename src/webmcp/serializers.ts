import type { MutableField, StateTraceState, TraceEvent } from "../domain/types";
import { verifyInvariants } from "../engine/invariantEngine";

const mutableFields: MutableField[] = [
  "customerEmail",
  "shippingAddress",
  "shippingMethod",
  "couponCode",
  "paymentName",
  "internalNote",
];

export function serializeEvent(event: TraceEvent) {
  return {
    sequence: event.sequence,
    timestamp: event.timestamp,
    actor: event.actor,
    type: event.type,
    transactionId: event.transactionId,
    revisionBefore: event.revisionBefore,
    revisionAfter: event.revisionAfter,
    summary: event.summary,
  };
}

export function serializeTransactionState(state: StateTraceState, includeRecentEvents = false) {
  const differences = mutableFields
    .filter((field) => state.visibleOrder[field] !== state.order[field])
    .map((field) => ({
      field,
      visibleValue: state.visibleOrder[field],
      committedValue: state.order[field],
    }));
  const checks = verifyInvariants(state);

  return {
    orderId: state.order.id,
    committedRevision: state.committedRevision,
    committed: {
      customerEmail: state.order.customerEmail,
      shippingAddress: state.order.shippingAddress,
      shippingMethod: state.order.shippingMethod,
      couponCode: state.order.couponCode,
      paymentName: state.order.paymentName,
      internalNote: state.order.internalNote,
    },
    visibleDifferences: differences,
    lockedFields: state.lockedFields,
    pendingTransactions: state.transactions
      .filter(({ status }) => status === "pending")
      .map(({ id, mutation, baseRevision, attempt }) => ({
        transactionId: id,
        field: mutation.field,
        proposedValue: mutation.nextValue,
        baseRevision,
        attempt,
      })),
    failedTransactions: state.transactions
      .filter(({ status }) => status === "failed" || status === "superseded")
      .map(({ id, status, mutation, errorCode, errorMessage, attempt }) => ({
        transactionId: id,
        status,
        field: mutation.field,
        proposedValue: mutation.nextValue,
        errorCode,
        errorMessage,
        attempt,
      })),
    verification: {
      passed: checks.filter(({ passed }) => passed).length,
      total: checks.length,
      allHardInvariantsPassed: checks
        .filter(({ severity }) => severity === "hard")
        .every(({ passed }) => passed),
    },
    recentEvents: includeRecentEvents ? state.events.slice(-10).map(serializeEvent) : undefined,
  };
}
