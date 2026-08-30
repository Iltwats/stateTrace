import type { FailureMode } from "../../domain/types";
import { selectLatestRetryable } from "../../store/selectors";
import { useStateTraceStore } from "../../store/useStateTraceStore";

const modes: Array<{
  value: FailureMode;
  label: string;
  description: string;
}> = [
  { value: "normal", label: "Healthy", description: "Commit after 800 ms" },
  {
    value: "slow_next_write",
    label: "Latency",
    description: "Hold next effect for 5 seconds",
  },
  {
    value: "fail_next_write",
    label: "Reject",
    description: "Fail the next effect",
  },
  {
    value: "duplicate_response",
    label: "Duplicate",
    description: "Deliver completion twice",
  },
  {
    value: "out_of_order",
    label: "Reorder",
    description: "Reverse completion timing",
  },
];

export function FailureControls() {
  const state = useStateTraceStore(({ state }) => state);
  const chooseFailureMode = useStateTraceStore(
    ({ chooseFailureMode }) => chooseFailureMode,
  );
  const stageChange = useStateTraceStore(({ stageChange }) => stageChange);
  const retryTransaction = useStateTraceStore(
    ({ retryTransaction }) => retryTransaction,
  );
  const reset = useStateTraceStore(({ reset }) => reset);
  const retryable = selectLatestRetryable(state);

  return (
    <section className="panel failure-controls" aria-labelledby="failure-heading">
      <div className="panel-heading compact">
        <div>
          <p className="section-kicker">Scenario controls</p>
          <h2 id="failure-heading">Fault injector</h2>
        </div>
        <button className="button-ghost" type="button" onClick={reset}>
          Reset workspace
        </button>
      </div>

      <div className="mode-grid">
        {modes.map((mode) => (
          <button
            type="button"
            className={`mode-button ${state.failureMode === mode.value ? "is-selected" : ""}`}
            aria-pressed={state.failureMode === mode.value}
            key={mode.value}
            onClick={() => chooseFailureMode(mode.value)}
          >
            <strong>{mode.label}</strong>
            <span>{mode.description}</span>
          </button>
        ))}
      </div>

      <div className="demo-actions">
        <div>
          <strong>Agent command runner</strong>
          <p><code>$ statetrace apply --field shippingAddress</code></p>
        </div>
        <div className="inline-actions">
          {retryable ? (
            <button
              type="button"
              className="button-secondary"
              onClick={() => retryTransaction(retryable.id)}
            >
              Retry failed transaction
            </button>
          ) : null}
          <button
            type="button"
            className="button-primary"
            onClick={() =>
              stageChange({
                field: "shippingAddress",
                value: "44 River Road, Portland, OR 97209",
                reason: "Agent corrected the customer delivery address.",
                actor: "agent",
              })
            }
          >
            Stage address transaction
          </button>
        </div>
      </div>
    </section>
  );
}
