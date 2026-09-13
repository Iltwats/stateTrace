import type {
  InvariantResult,
  MutableField,
  StateTraceState,
} from "../domain/types";
import { getPendingTransactions } from "./transactionEngine";

function result(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
  relatedTransactionIds: string[] = [],
  severity: InvariantResult["severity"] = "hard",
): InvariantResult {
  return { id, label, passed, evidence, relatedTransactionIds, severity };
}

export function verifyInvariants(state: StateTraceState): InvariantResult[] {
  const pending = getPendingTransactions(state);
  const fields: MutableField[] = [
    "customerEmail",
    "shippingAddress",
    "shippingMethod",
    "couponCode",
    "paymentName",
    "internalNote",
  ];

  const visibleMatchesCommitted = fields.every(
    (field) => state.visibleOrder[field] === state.order[field],
  );

  const committedByKey = new Map<string, string[]>();
  for (const transaction of state.transactions.filter(
    ({ status }) => status === "committed",
  )) {
    const ids = committedByKey.get(transaction.idempotencyKey) ?? [];
    ids.push(transaction.id);
    committedByKey.set(transaction.idempotencyKey, ids);
  }
  const duplicatedKeys = [...committedByKey.entries()].filter(
    ([, ids]) => ids.length > 1,
  );

  const commitEventsByTransaction = new Map<string, number>();
  for (const event of state.events.filter(
    ({ type }) => type === "effect_committed",
  )) {
    if (event.transactionId) {
      commitEventsByTransaction.set(
        event.transactionId,
        (commitEventsByTransaction.get(event.transactionId) ?? 0) + 1,
      );
    }
  }
  const committedWithoutOneEvent = state.transactions
    .filter(({ status }) => status === "committed")
    .filter(({ id }) => commitEventsByTransaction.get(id) !== 1);

  const failedWithCommitEvent = state.transactions
    .filter(({ status }) => status === "failed")
    .filter(({ id }) => (commitEventsByTransaction.get(id) ?? 0) > 0);

  const sequences = state.events.map(({ sequence }) => sequence);
  const sequenceIsContinuous = sequences.every(
    (sequence, index) => sequence === index + 1,
  );

  const revisionsAreMonotonic = state.events.every((event, index, events) => {
    if (event.revisionAfter < event.revisionBefore) return false;
    if (index === 0) return true;
    return event.revisionBefore >= events[index - 1].revisionBefore;
  });

  const activeLockViolations: string[] = [];
  for (const field of fields) {
    let locked = false;
    for (const event of state.events) {
      if (event.payload.field !== field) continue;
      if (event.type === "field_locked") locked = true;
      if (event.type === "field_unlocked") locked = false;
      if (event.type === "effect_committed" && locked && event.transactionId) {
        activeLockViolations.push(event.transactionId);
      }
    }
  }

  return [
    result(
      "visible-settled",
      "Visible state settles to committed state",
      pending.length > 0 || visibleMatchesCommitted,
      pending.length > 0
        ? `${pending.length} optimistic transaction(s) are still pending.`
        : visibleMatchesCommitted
          ? "No pending effects and every mutable field matches committed state."
          : "No effects are pending, but visible and committed fields differ.",
      pending.map(({ id }) => id),
    ),
    result(
      "idempotency-once",
      "Idempotency keys commit at most once",
      duplicatedKeys.length === 0,
      duplicatedKeys.length === 0
        ? "No idempotency key has more than one committed transaction."
        : `Duplicate committed keys: ${duplicatedKeys.map(([key]) => key).join(", ")}.`,
      duplicatedKeys.flatMap(([, ids]) => ids),
    ),
    result(
      "one-commit-event",
      "Committed transactions have exactly one commit event",
      committedWithoutOneEvent.length === 0,
      committedWithoutOneEvent.length === 0
        ? "Every committed transaction has one matching trace event."
        : `${committedWithoutOneEvent.length} transaction(s) have an invalid commit-event count.`,
      committedWithoutOneEvent.map(({ id }) => id),
    ),
    result(
      "failed-never-committed",
      "Failed transactions never commit",
      failedWithCommitEvent.length === 0,
      failedWithCommitEvent.length === 0
        ? "No failed transaction has a commit event."
        : `${failedWithCommitEvent.length} failed transaction(s) also committed.`,
      failedWithCommitEvent.map(({ id }) => id),
    ),
    result(
      "locked-fields-stable",
      "Locked fields reject commits",
      activeLockViolations.length === 0,
      activeLockViolations.length === 0
        ? "No effect committed while its target field was locked."
        : `${activeLockViolations.length} effect(s) committed while locked.`,
      activeLockViolations,
    ),
    result(
      "event-sequence",
      "Trace sequence is continuous",
      sequenceIsContinuous,
      sequenceIsContinuous
        ? `${sequences.length} trace event(s) are continuously ordered.`
        : "Trace sequence contains a gap or duplicate.",
    ),
    result(
      "revision-monotonic",
      "Committed revision is monotonic",
      revisionsAreMonotonic,
      revisionsAreMonotonic
        ? `Revision advanced monotonically to ${state.committedRevision}.`
        : "At least one trace event moved the revision backwards.",
    ),
  ];
}
