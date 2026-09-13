export type Actor = "human" | "agent" | "system";

export type ShippingMethod = "standard" | "express" | "pickup";

export type MutableField =
  | "customerEmail"
  | "shippingAddress"
  | "shippingMethod"
  | "couponCode"
  | "paymentName"
  | "internalNote";

export type FieldValue = string;

export type FailureMode =
  "normal" | "slow_next_write" | "fail_next_write" | "duplicate_response" | "out_of_order";

export type TransactionStatus =
  "created" | "optimistic" | "pending" | "committed" | "failed" | "superseded" | "cancelled";

export type Order = {
  id: string;
  customerName: string;
  customerEmail: string;
  shippingAddress: string;
  shippingMethod: ShippingMethod;
  couponCode: string;
  paymentName: string;
  internalNote: string;
  fulfillmentStatus: "unfulfilled" | "processing" | "shipped";
  totalCents: number;
  lineItems: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPriceCents: number;
  }>;
};

export type Mutation = {
  field: MutableField;
  previousValue: FieldValue;
  nextValue: FieldValue;
};

export type Transaction = {
  id: string;
  idempotencyKey: string;
  actor: Actor;
  status: TransactionStatus;
  baseRevision: number;
  createdAt: number;
  updatedAt: number;
  mutation: Mutation;
  reason: string;
  attempt: number;
  parentTransactionId?: string;
  errorCode?: string;
  errorMessage?: string;
};

export type TraceEventType =
  | "transaction_created"
  | "optimistic_applied"
  | "effect_started"
  | "effect_committed"
  | "effect_failed"
  | "effect_superseded"
  | "effect_cancelled"
  | "duplicate_ignored"
  | "human_change_committed"
  | "field_locked"
  | "field_unlocked"
  | "failure_mode_changed"
  | "invariants_checked"
  | "fixture_saved"
  | "trace_reset";

export type TraceEvent = {
  id: string;
  sequence: number;
  timestamp: number;
  actor: Actor;
  type: TraceEventType;
  transactionId?: string;
  revisionBefore: number;
  revisionAfter: number;
  summary: string;
  payload: Record<string, unknown>;
};

export type RegressionFixture = {
  id: string;
  name: string;
  description: string;
  expectedOutcome: "recovered" | "conflict_detected" | "write_failed";
  createdAt: number;
  startingOrder: Order;
  events: TraceEvent[];
};

export type FormCheckpoint = {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  revision: number;
  order: Order;
};

export type StateTraceState = {
  order: Order;
  visibleOrder: Order;
  committedRevision: number;
  fieldLastChangedRevision: Record<MutableField, number>;
  lockedFields: MutableField[];
  transactions: Transaction[];
  events: TraceEvent[];
  failureMode: FailureMode;
  savedFixtures: RegressionFixture[];
  checkpoints: FormCheckpoint[];
  nextSequence: number;
};

export type InvariantResult = {
  id: string;
  label: string;
  passed: boolean;
  severity: "hard" | "warning";
  evidence: string;
  relatedTransactionIds: string[];
};
