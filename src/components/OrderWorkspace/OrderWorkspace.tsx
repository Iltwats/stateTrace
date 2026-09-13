import { useState } from "react";
import type { Actor, MutableField, TraceEvent } from "../../domain/types";
import { useStateTraceStore } from "../../store/useStateTraceStore";
import { EditableField } from "./EditableField";
import { PaymentCardFields } from "./PaymentCardFields";
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
  const [placed, setPlaced] = useState(false);
  const discountCents = state.order.couponCode ? 1480 : 0;
  const finalTotal = state.order.totalCents - discountCents;

  function editableField(
    field: Exclude<MutableField, "shippingMethod">,
    label: string,
    multiline = false,
  ) {
    return (
      <EditableField
        field={field}
        label={label}
        committedValue={state.order[field]}
        visibleValue={state.visibleOrder[field]}
        lastActor={lastActorForField(state.events, field)}
        locked={state.lockedFields.includes(field)}
        multiline={multiline}
        onCommit={(value) => commitHumanField(field, value)}
      />
    );
  }

  return (
    <section
      id="checkout-products"
      className="checkout-layout"
      aria-label="Checkout demo"
    >
      <form
        className="checkout-form"
        onSubmit={(event) => {
          event.preventDefault();
          setPlaced(true);
        }}
      >
        <div className="checkout-form-heading">
          <div>
            <p className="section-kicker">Customer information</p>
            <h2>Checkout details</h2>
          </div>
          <span>All fields required</span>
        </div>

        <section className="checkout-section" aria-labelledby="contact-heading">
          <div className="checkout-section-title">
            <span>1</span>
            <div>
              <h3 id="contact-heading">Contact</h3>
              <p>Receipt and delivery updates</p>
            </div>
          </div>
          {editableField("customerEmail", "Email address")}
        </section>

        <section className="checkout-section" aria-labelledby="delivery-heading">
          <div className="checkout-section-title">
            <span>2</span>
            <div>
              <h3 id="delivery-heading">Delivery</h3>
              <p>Where and how your order should arrive</p>
            </div>
          </div>
          {editableField("shippingAddress", "Shipping address")}
          <ShippingMethodField
            committedValue={state.order.shippingMethod}
            visibleValue={state.visibleOrder.shippingMethod}
            lastActor={lastActorForField(state.events, "shippingMethod")}
            locked={state.lockedFields.includes("shippingMethod")}
            onCommit={(value) => commitHumanField("shippingMethod", value)}
          />
          {editableField("internalNote", "Delivery instructions", true)}
        </section>

        <section className="checkout-section" aria-labelledby="payment-heading">
          <div className="checkout-section-title">
            <span>3</span>
            <div>
              <h3 id="payment-heading">Payment</h3>
              <p>Enter a demo card to see live card-type detection</p>
            </div>
          </div>
          {editableField("paymentName", "Name on card")}
          <PaymentCardFields />
        </section>

        <section className="checkout-section" aria-labelledby="discount-heading">
          <div className="checkout-section-title">
            <span>4</span>
            <div>
              <h3 id="discount-heading">Discount</h3>
              <p>You or your agent can apply a code</p>
            </div>
          </div>
          {editableField("couponCode", "Coupon code")}
        </section>

        <div className="checkout-submit">
          <button type="submit">
            {placed ? "Demo order complete ✓" : `Pay ${formatCurrency(finalTotal)}`}
          </button>
          <p>This is a simulation. No payment or order is submitted.</p>
        </div>
      </form>

      <aside className="order-summary" aria-labelledby="summary-heading">
        <div className="summary-heading">
          <div>
            <p className="section-kicker">Order {state.order.id}</p>
            <h2 id="summary-heading">Order details</h2>
          </div>
          <span>3 items</span>
        </div>

        <ul className="checkout-items">
          {state.order.lineItems.map((item) => (
            <li key={item.id}>
              <div className="product-image" aria-hidden="true">
                {item.name === "Studio task lamp" ? "◒" : "⌁"}
                <span>{item.quantity}</span>
              </div>
              <div>
                <strong>{item.name}</strong>
                <span>{item.name === "Studio task lamp" ? "Matte black" : "Gold / 2 m"}</span>
              </div>
              <b>{formatCurrency(item.quantity * item.unitPriceCents)}</b>
            </li>
          ))}
        </ul>

        <div className="summary-totals">
          <div><span>Subtotal</span><strong>{formatCurrency(state.order.totalCents)}</strong></div>
          <div><span>Shipping</span><strong>Free</strong></div>
          {state.order.couponCode ? (
            <div className="discount-row">
              <span>{state.order.couponCode}</span>
              <strong>−{formatCurrency(discountCents)}</strong>
            </div>
          ) : null}
          <div className="summary-total"><span>Total</span><strong>{formatCurrency(finalTotal)}</strong></div>
        </div>

        <div className="summary-observability">
          <span className="activity-state is-ready" aria-hidden="true" />
          <p>
            Changes to this checkout are captured for you, whether they come
            from the page or a WebMCP agent.
          </p>
        </div>
      </aside>
    </section>
  );
}
