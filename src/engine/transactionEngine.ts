import type {
  Actor,
  FailureMode,
  FieldValue,
  MutableField,
  ShippingMethod,
  StateTraceState,
  TraceEvent,
  TraceEventType,
  Transaction,
} from "../domain/types";

export type EngineRuntime = {
  now: () => number;
  id: () => string;
};

export type StageChangeInput = {
  field: MutableField;
  value: FieldValue;
  expectedRevision: number;
  idempotencyKey: string;
  reason: string;
  actor?: Actor;
  parentTransactionId?: string;
  attempt?: number;
};

export type ResolveOutcome =
  | { type: "commit" }
  | { type: "fail"; code?: string; message?: string }
  | { type: "cancel"; message?: string };

export class TransactionEngineError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "TransactionEngineError";
    this.code = code;
  }
}

const defaultRuntime: EngineRuntime = {
  now: () => Date.now(),
  id: () => crypto.randomUUID(),
};

const pendingStatuses = new Set<Transaction["status"]>([
  "created",
  "optimistic",
  "pending",
]);

function cloneState(state: StateTraceState): StateTraceState {
  return structuredClone(state);
}

function getFieldValue(
  state: Pick<StateTraceState, "order">,
  field: MutableField,
): FieldValue {
  return state.order[field];
}

function setFieldValue(
  state: StateTraceState,
  target: "order" | "visibleOrder",
  field: MutableField,
  value: FieldValue,
) {
  if (field === "shippingMethod") {
    state[target][field] = value as ShippingMethod;
    return;
  }

  state[target][field] = value;
}

function validateFieldValue(field: MutableField, value: FieldValue) {
  const trimmed = value.trim();

  if (field === "shippingMethod") {
    if (!(["standard", "express", "pickup"] as const).includes(value as ShippingMethod)) {
      throw new TransactionEngineError(
        "INVALID_VALUE",
        "Shipping method must be standard, express, or pickup.",
      );
    }
    return;
  }

  const maxLength = field === "internalNote" ? 400 : 240;
  if (!trimmed || trimmed.length > maxLength) {
    throw new TransactionEngineError(
      "INVALID_VALUE",
      `${field} must contain between 1 and ${maxLength} characters.`,
    );
  }
}

function appendEvent(
  state: StateTraceState,
  runtime: EngineRuntime,
  event: {
    actor: Actor;
    type: TraceEventType;
    transactionId?: string;
    revisionBefore: number;
    revisionAfter: number;
    summary: string;
    payload?: Record<string, unknown>;
  },
) {
  const traceEvent: TraceEvent = {
    id: runtime.id(),
    sequence: state.nextSequence,
    timestamp: runtime.now(),
    actor: event.actor,
    type: event.type,
    transactionId: event.transactionId,
    revisionBefore: event.revisionBefore,
    revisionAfter: event.revisionAfter,
    summary: event.summary,
    payload: event.payload ?? {},
  };

  state.events.push(traceEvent);
  state.nextSequence += 1;
}

function rebuildVisibleOrder(state: StateTraceState) {
  state.visibleOrder = structuredClone(state.order);

  for (const transaction of state.transactions) {
    if (pendingStatuses.has(transaction.status)) {
      setFieldValue(
        state,
        "visibleOrder",
        transaction.mutation.field,
        transaction.mutation.nextValue,
      );
    }
  }
}

function findTransaction(state: StateTraceState, transactionId: string) {
  const transaction = state.transactions.find(({ id }) => id === transactionId);
  if (!transaction) {
    throw new TransactionEngineError(
      "TRANSACTION_NOT_FOUND",
      `Transaction ${transactionId} does not exist.`,
    );
  }
  return transaction;
}

export function stageOrderChange(
  currentState: StateTraceState,
  input: StageChangeInput,
  runtime: EngineRuntime = defaultRuntime,
): { state: StateTraceState; transaction: Transaction } {
  const state = cloneState(currentState);
  const actor = input.actor ?? "agent";
  const value = input.field === "shippingMethod" ? input.value : input.value.trim();

  validateFieldValue(input.field, value);

  if (input.expectedRevision !== state.committedRevision) {
    throw new TransactionEngineError(
      "STALE_REVISION",
      `Expected revision ${input.expectedRevision}, but the current revision is ${state.committedRevision}. Read the current transaction state and retry.`,
    );
  }

  if (state.lockedFields.includes(input.field)) {
    throw new TransactionEngineError(
      "FIELD_LOCKED",
      `${input.field} is locked by the user and cannot be changed.`,
    );
  }

  const existingByKey = state.transactions.find(
    ({ idempotencyKey }) => idempotencyKey === input.idempotencyKey,
  );
  if (existingByKey) {
    throw new TransactionEngineError(
      "DUPLICATE_IDEMPOTENCY_KEY",
      `Idempotency key ${input.idempotencyKey} already belongs to transaction ${existingByKey.id}.`,
    );
  }

  const pendingForField = state.transactions.find(
    (transaction) =>
      transaction.mutation.field === input.field &&
      pendingStatuses.has(transaction.status),
  );
  if (pendingForField) {
    throw new TransactionEngineError(
      "FIELD_PENDING",
      `${input.field} already has pending transaction ${pendingForField.id}.`,
    );
  }

  const timestamp = runtime.now();
  const transaction: Transaction = {
    id: runtime.id(),
    idempotencyKey: input.idempotencyKey,
    actor,
    status: "pending",
    baseRevision: input.expectedRevision,
    createdAt: timestamp,
    updatedAt: timestamp,
    mutation: {
      field: input.field,
      previousValue: getFieldValue(state, input.field),
      nextValue: value,
    },
    reason: input.reason.trim().slice(0, 240),
    attempt: input.attempt ?? 1,
    parentTransactionId: input.parentTransactionId,
  };

  state.transactions.push(transaction);
  appendEvent(state, runtime, {
    actor,
    type: "transaction_created",
    transactionId: transaction.id,
    revisionBefore: state.committedRevision,
    revisionAfter: state.committedRevision,
    summary: `${actor === "agent" ? "Agent" : "Human"} created a ${input.field} transaction.`,
    payload: {
      field: input.field,
      baseRevision: transaction.baseRevision,
      attempt: transaction.attempt,
    },
  });

  setFieldValue(state, "visibleOrder", input.field, value);
  appendEvent(state, runtime, {
    actor: "system",
    type: "optimistic_applied",
    transactionId: transaction.id,
    revisionBefore: state.committedRevision,
    revisionAfter: state.committedRevision,
    summary: `Visible ${input.field} updated optimistically; commit is still pending.`,
    payload: { field: input.field, value },
  });

  return { state, transaction: structuredClone(transaction) };
}

export function resolveTransaction(
  currentState: StateTraceState,
  transactionId: string,
  outcome: ResolveOutcome,
  runtime: EngineRuntime = defaultRuntime,
): StateTraceState {
  const state = cloneState(currentState);
  const transaction = findTransaction(state, transactionId);
  const revisionBefore = state.committedRevision;

  if (transaction.status === "committed") {
    appendEvent(state, runtime, {
      actor: "system",
      type: "duplicate_ignored",
      transactionId,
      revisionBefore,
      revisionAfter: revisionBefore,
      summary: `Duplicate completion for ${transactionId} was ignored.`,
      payload: { idempotencyKey: transaction.idempotencyKey },
    });
    return state;
  }

  if (!pendingStatuses.has(transaction.status)) {
    throw new TransactionEngineError(
      "TRANSACTION_NOT_PENDING",
      `Transaction ${transactionId} is ${transaction.status} and cannot resolve again.`,
    );
  }

  if (outcome.type === "fail") {
    transaction.status = "failed";
    transaction.updatedAt = runtime.now();
    transaction.errorCode = outcome.code ?? "SYNTHETIC_WRITE_FAILED";
    transaction.errorMessage =
      outcome.message ?? "The synthetic server rejected the write.";
    appendEvent(state, runtime, {
      actor: "system",
      type: "effect_failed",
      transactionId,
      revisionBefore,
      revisionAfter: revisionBefore,
      summary: `${transaction.mutation.field} failed to commit.`,
      payload: {
        code: transaction.errorCode,
        message: transaction.errorMessage,
      },
    });
    rebuildVisibleOrder(state);
    return state;
  }

  if (outcome.type === "cancel") {
    transaction.status = "cancelled";
    transaction.updatedAt = runtime.now();
    transaction.errorCode = "CANCELLED";
    transaction.errorMessage = outcome.message ?? "The pending effect was cancelled.";
    appendEvent(state, runtime, {
      actor: "system",
      type: "effect_cancelled",
      transactionId,
      revisionBefore,
      revisionAfter: revisionBefore,
      summary: `${transaction.mutation.field} transaction was cancelled.`,
    });
    rebuildVisibleOrder(state);
    return state;
  }

  const field = transaction.mutation.field;
  if (state.lockedFields.includes(field)) {
    transaction.status = "superseded";
    transaction.updatedAt = runtime.now();
    transaction.errorCode = "FIELD_LOCKED";
    transaction.errorMessage = `${field} was locked before the operation committed.`;
    appendEvent(state, runtime, {
      actor: "system",
      type: "effect_superseded",
      transactionId,
      revisionBefore,
      revisionAfter: revisionBefore,
      summary: `${field} did not commit because the user locked it.`,
      payload: { field },
    });
    rebuildVisibleOrder(state);
    return state;
  }

  if (state.fieldLastChangedRevision[field] > transaction.baseRevision) {
    transaction.status = "superseded";
    transaction.updatedAt = runtime.now();
    transaction.errorCode = "FIELD_CONFLICT";
    transaction.errorMessage = `${field} changed after this transaction was created.`;
    appendEvent(state, runtime, {
      actor: "system",
      type: "effect_superseded",
      transactionId,
      revisionBefore,
      revisionAfter: revisionBefore,
      summary: `${field} did not commit because a newer value exists.`,
      payload: {
        field,
        baseRevision: transaction.baseRevision,
        fieldRevision: state.fieldLastChangedRevision[field],
      },
    });
    rebuildVisibleOrder(state);
    return state;
  }

  state.committedRevision += 1;
  setFieldValue(
    state,
    "order",
    transaction.mutation.field,
    transaction.mutation.nextValue,
  );
  state.fieldLastChangedRevision[field] = state.committedRevision;
  transaction.status = "committed";
  transaction.updatedAt = runtime.now();
  appendEvent(state, runtime, {
    actor: "system",
    type: "effect_committed",
    transactionId,
    revisionBefore,
    revisionAfter: state.committedRevision,
    summary: `${field} committed at revision ${state.committedRevision}.`,
    payload: {
      field,
      value: transaction.mutation.nextValue,
      idempotencyKey: transaction.idempotencyKey,
    },
  });
  rebuildVisibleOrder(state);
  return state;
}

export function commitHumanChange(
  currentState: StateTraceState,
  field: MutableField,
  value: FieldValue,
  runtime: EngineRuntime = defaultRuntime,
): StateTraceState {
  const state = cloneState(currentState);
  const nextValue = field === "shippingMethod" ? value : value.trim();
  validateFieldValue(field, nextValue);

  if (state.lockedFields.includes(field)) {
    throw new TransactionEngineError(
      "FIELD_LOCKED",
      `${field} is locked. Unlock it before editing.`,
    );
  }

  const previousValue = getFieldValue(state, field);
  const revisionBefore = state.committedRevision;
  state.committedRevision += 1;
  setFieldValue(state, "order", field, nextValue);
  state.fieldLastChangedRevision[field] = state.committedRevision;
  appendEvent(state, runtime, {
    actor: "human",
    type: "human_change_committed",
    revisionBefore,
    revisionAfter: state.committedRevision,
    summary: `Human changed ${field} at revision ${state.committedRevision}.`,
    payload: { field, previousValue, nextValue },
  });
  rebuildVisibleOrder(state);
  return state;
}

export function setFieldLock(
  currentState: StateTraceState,
  field: MutableField,
  locked: boolean,
  runtime: EngineRuntime = defaultRuntime,
): StateTraceState {
  const state = cloneState(currentState);
  const currentlyLocked = state.lockedFields.includes(field);
  if (currentlyLocked === locked) {
    return state;
  }

  const revisionBefore = state.committedRevision;
  state.committedRevision += 1;
  state.lockedFields = locked
    ? [...state.lockedFields, field]
    : state.lockedFields.filter((candidate) => candidate !== field);
  appendEvent(state, runtime, {
    actor: "human",
    type: locked ? "field_locked" : "field_unlocked",
    revisionBefore,
    revisionAfter: state.committedRevision,
    summary: `Human ${locked ? "locked" : "unlocked"} ${field}.`,
    payload: { field },
  });
  return state;
}

export function setFailureMode(
  currentState: StateTraceState,
  failureMode: FailureMode,
  runtime: EngineRuntime = defaultRuntime,
): StateTraceState {
  const state = cloneState(currentState);
  state.failureMode = failureMode;
  appendEvent(state, runtime, {
    actor: "human",
    type: "failure_mode_changed",
    revisionBefore: state.committedRevision,
    revisionAfter: state.committedRevision,
    summary: `Failure mode changed to ${failureMode}.`,
    payload: { failureMode },
  });
  return state;
}

export function retryFailedTransaction(
  currentState: StateTraceState,
  transactionId: string,
  expectedRevision: number,
  idempotencyKey: string,
  runtime: EngineRuntime = defaultRuntime,
): { state: StateTraceState; transaction: Transaction } {
  const original = findTransaction(currentState, transactionId);
  if (!(original.status === "failed" || original.status === "superseded")) {
    throw new TransactionEngineError(
      "TRANSACTION_NOT_RETRYABLE",
      `Transaction ${transactionId} is ${original.status} and cannot be retried.`,
    );
  }

  return stageOrderChange(
    currentState,
    {
      field: original.mutation.field,
      value: original.mutation.nextValue,
      expectedRevision,
      idempotencyKey,
      reason: `Retry of ${transactionId}: ${original.reason}`,
      actor: "agent",
      parentTransactionId: original.id,
      attempt: original.attempt + 1,
    },
    runtime,
  );
}

export function getPendingTransactions(state: StateTraceState) {
  return state.transactions.filter((transaction) =>
    pendingStatuses.has(transaction.status),
  );
}

