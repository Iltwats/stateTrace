import type { Actor, MutableField, TraceEvent } from "../../domain/types";
import { useStateTraceStore } from "../../store/useStateTraceStore";
import { EditableField } from "./EditableField";
import { ShippingMethodField } from "./ShippingMethodField";

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function lastActorForField(
  events: TraceEvent[],
  field: MutableField,
): Actor | undefined {
  return [...events]
    .reverse()
    .find(
      (event) =>
        event.payload.field === field &&
        (event.actor === "human" || event.actor === "agent"),
    )?.actor;
}

export function OrderWorkspace() {
  const state = useStateTraceStore(({ state }) => state);
  const commitHumanField = useStateTraceStore(
    ({ commitHumanField }) => commitHumanField,
  );
  const toggleFieldLock = useStateTraceStore(
    ({ toggleFieldLock }) => toggleFieldLock,
  );
  return (
    <section className="order-workspace" aria-labelledby="order-heading">
      <div className="order-card-heading">
        <div>
          <p className="section-kicker">Order {state.order.id}</p>
          <h2 id="order-heading">Shipping details</h2>
          <p>Editable by you or a connected agent.</p>
        </div>
        <div className="order-heading-meta">
          <span className="order-status">{state.order.fulfillmentStatus}</span>
          <span className="revision-badge">r{state.committedRevision}</span>
        </div>
      </div>

      <div className="customer-row">
        <div className="avatar" aria-hidden="true">MC</div>
        <div>
          <strong>{state.order.customerName}</strong>
          <p>{state.order.customerEmail}</p>
        </div>
        <div className="order-total">
          <span>
            {state.order.lineItems.reduce(
              (total, item) => total + item.quantity,
              0,
            )}{" "}
            items
          </span>
          <strong>{formatCurrency(state.order.totalCents)}</strong>
        </div>
      </div>

      <div className="collaboration-legend" aria-label="Field editing model">
        <span><i className="actor-swatch actor-human">H</i> Your edit</span>
        <span><i className="actor-swatch actor-agent">A</i> Agent edit</span>
      </div>

      <div className="field-stack">
        <EditableField
          field="shippingAddress"
          label="Shipping address"
          committedValue={state.order.shippingAddress}
          visibleValue={state.visibleOrder.shippingAddress}
          lastActor={lastActorForField(state.events, "shippingAddress")}
          locked={state.lockedFields.includes("shippingAddress")}
          onCommit={(value) => commitHumanField("shippingAddress", value)}
          onToggleLock={() => toggleFieldLock("shippingAddress")}
        />

        <ShippingMethodField
          committedValue={state.order.shippingMethod}
          visibleValue={state.visibleOrder.shippingMethod}
          lastActor={lastActorForField(state.events, "shippingMethod")}
          locked={state.lockedFields.includes("shippingMethod")}
          onCommit={(value) => commitHumanField("shippingMethod", value)}
          onToggleLock={() => toggleFieldLock("shippingMethod")}
        />

        <EditableField
          field="internalNote"
          label="Internal note"
          committedValue={state.order.internalNote}
          visibleValue={state.visibleOrder.internalNote}
          lastActor={lastActorForField(state.events, "internalNote")}
          locked={state.lockedFields.includes("internalNote")}
          multiline
          onCommit={(value) => commitHumanField("internalNote", value)}
          onToggleLock={() => toggleFieldLock("internalNote")}
        />
      </div>
    </section>
  );
}
