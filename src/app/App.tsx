import { useCallback, useState } from "react";
import { AgentDemo } from "../components/AgentDemo/AgentDemo";
import { ErrorToast } from "../components/ErrorToast/ErrorToast";
import { OrderWorkspace } from "../components/OrderWorkspace/OrderWorkspace";
import { TraceDrawer } from "../components/TraceDrawer/TraceDrawer";
import { verifyInvariants } from "../engine/invariantEngine";
import { selectPendingCount } from "../store/selectors";
import { useStateTraceStore } from "../store/useStateTraceStore";
import { useWebMCPTools } from "../webmcp/useWebMCPTools";

export function App() {
  const webMCP = useWebMCPTools();
  const [traceOpen, setTraceOpen] = useState(false);
  const closeTrace = useCallback(() => setTraceOpen(false), []);
  const state = useStateTraceStore(({ state }) => state);
  const checks = verifyInvariants(state);
  const allChecksPassing = checks.every(({ passed }) => passed);
  const pendingCount = selectPendingCount(state);
  const latestEvent = state.events.at(-1);

  return (
    <main className="minimal-shell">
      <header className="site-header">
        <div className="simple-brand">
          <div className="product-mark" aria-hidden="true">
            ST
          </div>
          <div>
            <h1>StateTrace</h1>
            <p>Observable WebMCP demo</p>
          </div>
        </div>

        <div className="site-header-actions">
          <div className={`connection-pill connection-${webMCP.state}`}>
            <span
              className={`protocol-light protocol-${webMCP.state}`}
              aria-hidden="true"
            />
            <span>
              {webMCP.state === "available"
                ? `WebMCP ready · ${webMCP.toolCount} tools`
                : webMCP.state === "checking"
                  ? "Checking WebMCP"
                  : "Manual demo mode"}
            </span>
          </div>
          <button
            type="button"
            className="activity-button"
            aria-haspopup="dialog"
            onClick={() => setTraceOpen(true)}
          >
            Activity
            <span>{state.events.length}</span>
          </button>
        </div>
      </header>

      <section className="minimal-hero" aria-labelledby="demo-heading">
        <p className="eyebrow">WebMCP commerce demo</p>
        <h2 id="demo-heading">One order. One agent. Every change visible.</h2>
        <p>
          An agent can read and update this form through semantic WebMCP tools.
          You stay in control, and every action appears in the activity trace.
        </p>
      </section>

      <AgentDemo />
      <OrderWorkspace />

      <section className="activity-preview" aria-label="Latest activity">
        <div className="activity-preview-copy">
          <span
            className={`activity-state ${pendingCount ? "is-working" : allChecksPassing ? "is-ready" : "is-error"}`}
            aria-hidden="true"
          />
          <div>
            <strong>
              {pendingCount
                ? "Agent change in progress"
                : latestEvent?.summary ?? "Waiting for the first agent action"}
            </strong>
            <p>
              Revision {state.committedRevision} · {state.events.length} events ·{" "}
              {allChecksPassing ? "verified" : "needs attention"}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="text-link-button"
          onClick={() => setTraceOpen(true)}
        >
          View activity →
        </button>
      </section>

      <footer className="site-footer">
        <span>StateTrace is an open-source WebMCP reference app.</span>
        <a
          href="https://github.com/Iltwats/web-mcp-openai"
          target="_blank"
          rel="noreferrer"
        >
          View source ↗
        </a>
      </footer>

      <ErrorToast />
      <TraceDrawer
        open={traceOpen}
        eventCount={state.events.length}
        checks={checks}
        committedRevision={state.committedRevision}
        onClose={closeTrace}
      />
    </main>
  );
}
