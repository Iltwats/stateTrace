import type { Actor, MutableField, StateTraceState, TransactionStatus } from "../../domain/types";
import { useStateTraceStore } from "../../store/useStateTraceStore";

const fieldLabels: Record<MutableField, string> = {
  customerEmail: "Contact email",
  shippingAddress: "Shipping address",
  shippingMethod: "Delivery method",
  couponCode: "Discount code",
  paymentName: "Name on card",
  internalNote: "Delivery instructions",
};

const statusLabels: Record<TransactionStatus, string> = {
  created: "Started",
  optimistic: "In progress",
  pending: "In progress",
  committed: "Applied",
  failed: "Failed",
  superseded: "Not applied",
  cancelled: "Cancelled",
};

type ActivityItem = {
  id: string;
  timestamp: number;
  actor: Actor;
  title: string;
  before?: string;
  after?: string;
  status?: TransactionStatus;
};

function createActivityItems(state: StateTraceState): ActivityItem[] {
  const agentChanges: ActivityItem[] = state.transactions.map((transaction) => ({
    id: `transaction-${transaction.id}`,
    timestamp: transaction.updatedAt,
    actor: transaction.actor,
    title: `${fieldLabels[transaction.mutation.field]} ${
      transaction.status === "pending" ? "is changing" : "changed"
    }`,
    before: transaction.mutation.previousValue || "Empty",
    after: transaction.mutation.nextValue || "Empty",
    status: transaction.status,
  }));

  const humanChanges: ActivityItem[] = state.events.flatMap((event) => {
    const field = event.payload.field as MutableField | undefined;
    if (!field) return [];

    if (event.type === "human_change_committed") {
      return [
        {
          id: `event-${event.id}`,
          timestamp: event.timestamp,
          actor: "human" as const,
          title: `${fieldLabels[field]} changed`,
          before: String(event.payload.previousValue || "Empty"),
          after: String(event.payload.nextValue || "Empty"),
          status: "committed" as const,
        },
      ];
    }

    if (event.type === "field_locked" || event.type === "field_unlocked") {
      return [
        {
          id: `event-${event.id}`,
          timestamp: event.timestamp,
          actor: "human" as const,
          title: `${fieldLabels[field]} ${
            event.type === "field_locked" ? "protected" : "unprotected"
          }`,
        },
      ];
    }

    return [];
  });

  return [...agentChanges, ...humanChanges].sort((left, right) => right.timestamp - left.timestamp);
}

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}

export function getVisibleActivityCount(state: StateTraceState) {
  return createActivityItems(state).length;
}

export function ActivityFeed() {
  const state = useStateTraceStore(({ state }) => state);
  const items = createActivityItems(state);

  return (
    <section className="change-activity" aria-labelledby="change-activity-heading">
      <div className="drawer-section-heading">
        <div>
          <p className="section-kicker">Change history</p>
          <h3 id="change-activity-heading">What changed</h3>
        </div>
        <span>{items.length} changes</span>
      </div>

      {items.length === 0 ? (
        <div className="activity-empty">
          <span aria-hidden="true">◎</span>
          <strong>No changes yet</strong>
          <p>Edits made by you or an agent will appear here.</p>
        </div>
      ) : (
        <ol className="change-list">
          {items.map((item) => (
            <li key={item.id}>
              <div className={`change-actor actor-${item.actor}`} aria-hidden="true">
                {item.actor === "agent" ? "A" : "Y"}
              </div>
              <div className="change-content">
                <div className="change-title-row">
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.actor === "agent" ? "Agent" : "You"}</span>
                  </div>
                  <time>{formatTime(item.timestamp)}</time>
                </div>
                {item.before !== undefined && item.after !== undefined ? (
                  <div className="value-change">
                    <span>{item.before}</span>
                    <b aria-hidden="true">→</b>
                    <strong>{item.after}</strong>
                  </div>
                ) : null}
                {item.status ? (
                  <span className={`change-status status-${item.status}`}>
                    {statusLabels[item.status]}
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
