import type { Actor, TraceEvent } from "../../domain/types";
import { useStateTraceStore } from "../../store/useStateTraceStore";

const actorLabels: Record<Actor, string> = {
  human: "Human",
  agent: "Agent",
  system: "System",
};

function eventTime(event: TraceEvent) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(event.timestamp);
}

export function TransactionTimeline() {
  const events = useStateTraceStore(({ state }) => state.events);
  const transactions = useStateTraceStore(({ state }) => state.transactions);
  const cancelTransaction = useStateTraceStore(
    ({ cancelTransaction }) => cancelTransaction,
  );
  const newestFirst = [...events].reverse();

  return (
    <section className="panel transaction-timeline" aria-labelledby="timeline-heading">
      <div className="panel-heading compact">
        <div>
          <p className="section-kicker">Distributed trace</p>
          <h2 id="timeline-heading">Commit graph</h2>
        </div>
        <span className="event-count">{events.length} events · live</span>
      </div>

      {newestFirst.length === 0 ? (
        <div className="empty-state">
          <span className="empty-glyph" aria-hidden="true">○</span>
          <strong>No commits in trace</strong>
          <p><code>$ statetrace watch --resource ORD-2048</code></p>
        </div>
      ) : (
        <ol className="timeline-list">
          {newestFirst.map((event, index) => {
            const transaction = event.transactionId
              ? transactions.find(({ id }) => id === event.transactionId)
              : undefined;
            return (
              <li className={`timeline-event actor-${event.actor}`} key={event.id}>
                <div className="timeline-marker" aria-hidden="true" />
                <div className="timeline-content">
                  <div className="timeline-meta">
                    <span className="actor-badge">{actorLabels[event.actor]}</span>
                    <code className="commit-ref">evt-{event.sequence.toString().padStart(4, "0")}</code>
                    {index === 0 ? <span className="head-ref">HEAD</span> : null}
                    <time>{eventTime(event)}</time>
                    <span>
                      r{event.revisionBefore}
                      {event.revisionAfter !== event.revisionBefore
                        ? ` → r${event.revisionAfter}`
                        : ""}
                    </span>
                  </div>
                  <strong>{event.summary}</strong>
                  <div className="timeline-footer">
                    <span className="event-type">{event.type.replaceAll("_", " ")}</span>
                    {transaction ? (
                      <code className="transaction-ref">
                        tx/{transaction.id.slice(-8)} · {transaction.status}
                      </code>
                    ) : null}
                  </div>
                  {transaction?.status === "pending" &&
                  event.type === "optimistic_applied" ? (
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => cancelTransaction(transaction.id)}
                    >
                      Cancel pending effect
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
