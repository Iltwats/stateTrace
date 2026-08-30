import type { Order, StateTraceState } from "../domain/types";

export const baselineOrder: Order = {
  id: "ORD-2048",
  customerName: "Maya Chen",
  customerEmail: "maya.chen@example.com",
  shippingAddress: "18 Cedar Lane, Portland, OR 97205",
  shippingMethod: "standard",
  internalNote: "Customer prefers delivery after 3 PM.",
  fulfillmentStatus: "unfulfilled",
  totalCents: 14800,
  lineItems: [
    {
      id: "ITEM-1",
      name: "Studio task lamp",
      quantity: 1,
      unitPriceCents: 8900,
    },
    {
      id: "ITEM-2",
      name: "Braided cable set",
      quantity: 2,
      unitPriceCents: 2950,
    },
  ],
};

export function createBaselineState(): StateTraceState {
  const order = structuredClone(baselineOrder);

  return {
    order,
    visibleOrder: structuredClone(order),
    committedRevision: 1,
    fieldLastChangedRevision: {
      shippingAddress: 1,
      shippingMethod: 1,
      internalNote: 1,
    },
    lockedFields: [],
    transactions: [],
    events: [],
    failureMode: "normal",
    savedFixtures: [],
    nextSequence: 1,
  };
}

