import { useStateTraceStore } from "../../store/useStateTraceStore";
import { EditableField } from "./EditableField";
import { ShippingMethodField } from "./ShippingMethodField";

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
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
          <p className="section-kicker">Tracked resource</p>
          <h2 id="order-heading">order/{state.order.id}</h2>
        </div>
        <span className="revision-badge">HEAD · r{state.committedRevision}</span>
      </div>

      <div className="subsection-bar">
        <span>Resource context</span>
        <code>commerce.order</code>
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
        <span>Working tree</span>
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
          locked={state.lockedFields.includes("shippingAddress")}
          onCommit={(value) => commitHumanField("shippingAddress", value)}
          onToggleLock={() => toggleFieldLock("shippingAddress")}
        />

        <ShippingMethodField
          committedValue={state.order.shippingMethod}
          visibleValue={state.visibleOrder.shippingMethod}
          locked={state.lockedFields.includes("shippingMethod")}
          onCommit={(value) => commitHumanField("shippingMethod", value)}
          onToggleLock={() => toggleFieldLock("shippingMethod")}
        />

        <EditableField
          field="internalNote"
          label="Internal note"
          committedValue={state.order.internalNote}
          visibleValue={state.visibleOrder.internalNote}
          locked={state.lockedFields.includes("internalNote")}
          multiline
          onCommit={(value) => commitHumanField("internalNote", value)}
          onToggleLock={() => toggleFieldLock("internalNote")}
        />
      </div>
    </section>
  );
}
