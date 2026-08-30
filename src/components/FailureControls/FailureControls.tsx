import type { FailureMode } from "../../domain/types";
import { selectLatestRetryable } from "../../store/selectors";
import { useStateTraceStore } from "../../store/useStateTraceStore";

const modes: Array<{
  value: FailureMode;
  label: string;
  description: string;
}> = [
  { value: "normal", label: "Normal", description: "Commit after 800 ms" },
  {
    value: "slow_next_write",
    label: "Slow next",
    description: "Hold the next effect for 5 seconds",
  },
  {
    value: "fail_next_write",
    label: "Fail next",
    description: "Reject the next effect",
  },
  {
    value: "duplicate_response",
    label: "Duplicate",
    description: "Deliver completion twice",
  },
  {
    value: "out_of_order",
    label: "Out of order",
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
          <p className="section-kicker">Deterministic chaos</p>
          <h2 id="failure-heading">Next agent write</h2>
        </div>
        <button className="button-ghost" type="button" onClick={reset}>
          Reset trace
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
          <strong>Manual demo harness</strong>
          <p>Uses the same store action that WebMCP will invoke.</p>
        </div>
        <div className="inline-actions">
          {retryable ? (
            <button
              type="button"
              className="button-secondary"
              onClick={() => retryTransaction(retryable.id)}
            >
              Retry failed address
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
            Stage agent address change
          </button>
        </div>
      </div>
    </section>
  );
}

