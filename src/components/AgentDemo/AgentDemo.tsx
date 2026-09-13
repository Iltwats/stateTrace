import { selectLatestRetryable } from "../../store/selectors";
import { useStateTraceStore } from "../../store/useStateTraceStore";

const demoAddress = "44 River Road, Portland, OR 97209";

export function AgentDemo() {
  const state = useStateTraceStore(({ state }) => state);
  const stageChange = useStateTraceStore(({ stageChange }) => stageChange);
  const retryTransaction = useStateTraceStore(
    ({ retryTransaction }) => retryTransaction,
  );
  const reset = useStateTraceStore(({ reset }) => reset);
  const retryable = selectLatestRetryable(state);

  return (
    <section className="agent-prompt" aria-labelledby="agent-prompt-heading">
      <div>
        <p className="agent-prompt-label" id="agent-prompt-heading">
          Try this with your WebMCP agent
        </p>
        <p className="agent-prompt-text">
          “Update the shipping address to <strong>{demoAddress}</strong>, then
          verify that it committed.”
        </p>
      </div>
      <div className="agent-prompt-actions">
        {state.events.length > 0 ? (
          <button type="button" className="quiet-button" onClick={reset}>
            Reset
          </button>
        ) : null}
        {retryable ? (
          <button
            type="button"
            className="secondary-action"
            onClick={() => retryTransaction(retryable.id)}
          >
            Retry change
          </button>
        ) : null}
        <button
          type="button"
          className="primary-action"
          onClick={() =>
            stageChange({
              field: "shippingAddress",
              value: demoAddress,
              reason: "Previewed the WebMCP agent address update.",
              actor: "agent",
            })
          }
        >
          Preview agent update
        </button>
      </div>
    </section>
  );
}
