import { z } from "zod";

export const getTransactionStateInput = z
  .object({
    includeRecentEvents: z.boolean().optional().default(false),
  })
  .strict();

export const listTransactionEventsInput = z
  .object({
    afterSequence: z.number().int().min(0).optional(),
    limit: z.number().int().min(1).max(25).optional().default(10),
    transactionId: z.string().min(1).max(100).optional(),
    status: z
      .enum([
        "created",
        "optimistic",
        "pending",
        "committed",
        "failed",
        "superseded",
        "cancelled",
      ])
      .optional(),
  })
  .strict();

export const verifyTransactionStateInput = z
  .object({
    expectedRevision: z.number().int().min(1).optional(),
    expectedFields: z
      .object({
        customerEmail: z.string().email().max(240).optional(),
        shippingAddress: z.string().min(1).max(240).optional(),
        shippingMethod: z.enum(["standard", "express", "pickup"]).optional(),
        couponCode: z.string().max(32).optional(),
        paymentName: z.string().min(1).max(100).optional(),
        internalNote: z.string().min(1).max(400).optional(),
      })
      .strict()
      .optional(),
    transactionId: z.string().min(1).max(100).optional(),
    expectedTransactionStatus: z
      .enum(["committed", "failed", "superseded", "cancelled", "pending"])
      .optional(),
  })
  .strict();

export const stageOrderChangeInput = z
  .object({
    field: z.enum([
      "customerEmail",
      "shippingAddress",
      "shippingMethod",
      "couponCode",
      "paymentName",
      "internalNote",
    ]),
    value: z.string().max(400),
    expectedRevision: z.number().int().min(1),
    idempotencyKey: z.string().min(1).max(120),
    reason: z.string().min(1).max(240),
  })
  .strict();

export const retryFailedTransactionInput = z
  .object({
    transactionId: z.string().min(1).max(100),
    expectedRevision: z.number().int().min(1),
    idempotencyKey: z.string().min(1).max(120),
  })
  .strict();

export const saveRegressionFixtureInput = z
  .object({
    name: z.string().min(1).max(80),
    description: z.string().min(1).max(240),
    expectedOutcome: z.enum([
      "recovered",
      "conflict_detected",
      "write_failed",
    ]),
  })
  .strict();

export function parseToolInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (parsed.success) return parsed.data;

  const message = parsed.error.issues
    .map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`)
    .join("; ");
  throw new Error(`Invalid tool input: ${message}`);
}

export const inputSchemas = {
  getTransactionState: {
    type: "object",
    properties: {
      includeRecentEvents: {
        type: "boolean",
        description: "Include up to ten recent trace events in the result.",
      },
    },
    additionalProperties: false,
  },
  listTransactionEvents: {
    type: "object",
    properties: {
      afterSequence: {
        type: "integer",
        minimum: 0,
        description: "Return events after this sequence number.",
      },
      limit: {
        type: "integer",
        minimum: 1,
        maximum: 25,
        description: "Maximum number of ordered events to return.",
      },
      transactionId: {
        type: "string",
        description: "Return events for one transaction identifier.",
      },
      status: {
        type: "string",
        enum: [
          "created",
          "optimistic",
          "pending",
          "committed",
          "failed",
          "superseded",
          "cancelled",
        ],
        description: "Return events whose transaction currently has this status.",
      },
    },
    additionalProperties: false,
  },
  verifyTransactionState: {
    type: "object",
    properties: {
      expectedRevision: {
        type: "integer",
        minimum: 1,
        description: "Committed revision expected after the workflow.",
      },
      expectedFields: {
        type: "object",
        properties: {
          customerEmail: { type: "string" },
          shippingAddress: { type: "string" },
          shippingMethod: {
            type: "string",
            enum: ["standard", "express", "pickup"],
          },
          couponCode: { type: "string" },
          paymentName: { type: "string" },
          internalNote: { type: "string" },
        },
        additionalProperties: false,
        description: "Optional committed field values to verify.",
      },
      transactionId: {
        type: "string",
        description: "Optional transaction whose final status should be verified.",
      },
      expectedTransactionStatus: {
        type: "string",
        enum: ["committed", "failed", "superseded", "cancelled", "pending"],
        description: "Expected status for transactionId.",
      },
    },
    additionalProperties: false,
  },
  stageOrderChange: {
    type: "object",
    properties: {
      field: {
        type: "string",
        enum: [
          "customerEmail",
          "shippingAddress",
          "shippingMethod",
          "couponCode",
          "paymentName",
          "internalNote",
        ],
        description: "One supported checkout field to change.",
      },
      value: {
        type: "string",
        description: "New field value. Shipping method accepts standard, express, or pickup; coupon code may be empty.",
      },
      expectedRevision: {
        type: "integer",
        minimum: 1,
        description: "Committed revision observed before staging this write.",
      },
      idempotencyKey: {
        type: "string",
        description: "Unique key that prevents this logical write from committing twice.",
      },
      reason: {
        type: "string",
        description: "Concise explanation shown in the human-visible trace.",
      },
    },
    required: ["field", "value", "expectedRevision", "idempotencyKey", "reason"],
    additionalProperties: false,
  },
  retryFailedTransaction: {
    type: "object",
    properties: {
      transactionId: {
        type: "string",
        description: "Failed or superseded transaction to retry.",
      },
      expectedRevision: {
        type: "integer",
        minimum: 1,
        description: "Current committed revision observed before retrying.",
      },
      idempotencyKey: {
        type: "string",
        description: "New unique idempotency key for this retry attempt.",
      },
    },
    required: ["transactionId", "expectedRevision", "idempotencyKey"],
    additionalProperties: false,
  },
  saveRegressionFixture: {
    type: "object",
    properties: {
      name: { type: "string", description: "Short fixture name." },
      description: {
        type: "string",
        description: "What failed and what the regression should preserve.",
      },
      expectedOutcome: {
        type: "string",
        enum: ["recovered", "conflict_detected", "write_failed"],
        description: "Expected high-level result when the trace is replayed.",
      },
    },
    required: ["name", "description", "expectedOutcome"],
    additionalProperties: false,
  },
} as const;
