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
  const modifiedFields = [
    state.visibleOrder.shippingAddress !== state.order.shippingAddress,
    state.visibleOrder.shippingMethod !== state.order.shippingMethod,
    state.visibleOrder.internalNote !== state.order.internalNote,
  ].filter(Boolean).length;

  return (
    <section className="panel order-workspace" aria-labelledby="order-heading">
      <div className="panel-heading">
        <div>
          <p className="section-kicker">Commerce workbench</p>
          <h2 id="order-heading">Fulfillment details</h2>
        </div>
        <div className="order-heading-meta">
          <span className="order-status">Unfulfilled</span>
          <span className="revision-badge">HEAD · r{state.committedRevision}</span>
        </div>
      </div>

      <div className="collaboration-legend" aria-label="Field editing model">
        <span><i className="actor-swatch actor-human">H</i> Human commits directly</span>
        <span><i className="actor-swatch actor-agent">A</i> Agent stages through WebMCP</span>
      </div>

      <div className="subsection-bar">
        <span>Order context</span>
        <code>{state.order.id}</code>
      </div>
      <div className="customer-row">
        <div className="avatar" aria-hidden="true">MC</div>
        <div>
          <strong>{state.order.customerName}</strong>
          <p>{state.order.customerEmail}</p>
        </div>
        <div className="order-total">
          <span>Total</span>
          <strong>{formatCurrency(state.order.totalCents)}</strong>
        </div>
      </div>

      <div className="line-items" aria-label="Order line items">
        {state.order.lineItems.map((item) => (
          <div className="line-item" key={item.id}>
            <span>{item.quantity}× {item.name}</span>
            <strong>{formatCurrency(item.quantity * item.unitPriceCents)}</strong>
          </div>
        ))}
      </div>

      <div className="subsection-bar">
        <span>Shared form</span>
        <code className={modifiedFields ? "signal-pending" : "signal-good"}>
          {modifiedFields} modified
        </code>
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
