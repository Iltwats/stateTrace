import { ErrorToast } from "../components/ErrorToast/ErrorToast";
import { FailureControls } from "../components/FailureControls/FailureControls";
import { OrderWorkspace } from "../components/OrderWorkspace/OrderWorkspace";
import { RegressionPanel } from "../components/RegressionPanel/RegressionPanel";
import { TransactionTimeline } from "../components/TransactionTimeline/TransactionTimeline";
import { TruthInspector } from "../components/TruthInspector/TruthInspector";
import { VerificationPanel } from "../components/VerificationPanel/VerificationPanel";
import { verifyInvariants } from "../engine/invariantEngine";
import { selectFailedCount, selectPendingCount } from "../store/selectors";
import { useStateTraceStore } from "../store/useStateTraceStore";
import { useWebMCPTools } from "../webmcp/useWebMCPTools";

export function App() {
  const webMCP = useWebMCPTools();
  const state = useStateTraceStore(({ state }) => state);
  const checks = verifyInvariants(state);
  const passedChecks = checks.filter(({ passed }) => passed).length;
  const hasWorkingDiff =
    state.visibleOrder.shippingAddress !== state.order.shippingAddress ||
    state.visibleOrder.shippingMethod !== state.order.shippingMethod ||
    state.visibleOrder.internalNote !== state.order.internalNote;
  const pendingCount = selectPendingCount(state);
  const failedCount = selectFailedCount(state);

  return (
    <main className="app-shell">
      <header className="hero-panel">
        <div className="product-lockup">
          <div className="product-mark" aria-hidden="true">
            ST
          </div>
          <div>
            <div className="repo-path" aria-label="StateTrace repository path">
              <span>statetrace</span>
              <span className="repo-slash">/</span>
              <strong>transaction-observatory</strong>
            </div>
            <h1>StateTrace</h1>
          </div>
        </div>

        <div className="hero-intro">
          <p className="eyebrow">WebMCP transaction observability</p>
          <p className="hero-copy">
            Inspect the working tree, follow every human-agent commit, and
            recover failed effects without overwriting newer intent.
          </p>
        </div>

        <div className="protocol-card">
          <span
            className={`protocol-light protocol-${webMCP.state}`}
            aria-hidden="true"
          />
          <div>
            <strong>
              {webMCP.state === "available"
                ? `${webMCP.toolCount} WebMCP tools available`
                : webMCP.state === "checking"
                  ? "Checking WebMCP support"
                  : "Manual mode available"}
            </strong>
            <p>
              {webMCP.state === "available"
                ? "Human UI and semantic tools share one transaction engine."
                : "The complete human interface works without protocol support."}
            </p>
          </div>
        </div>
      </header>

      <section className="telemetry-strip" aria-label="Live trace summary">
        <div className="telemetry-item telemetry-resource">
          <span className="telemetry-label">Resource</span>
          <strong>{state.order.id.toLowerCase()}</strong>
          <span className="telemetry-sub">order workflow</span>
        </div>
        <div className="telemetry-item">
          <span className="telemetry-label">Branch</span>
          <strong className="branch-ref">● main</strong>
          <span className="telemetry-sub">human-agent/shared</span>
        </div>
        <div className="telemetry-item">
          <span className="telemetry-label">HEAD</span>
          <strong>r{state.committedRevision}</strong>
          <span className="telemetry-sub">committed revision</span>
        </div>
        <div className="telemetry-item">
          <span className="telemetry-label">Working tree</span>
          <strong className={hasWorkingDiff ? "signal-pending" : "signal-good"}>
            {hasWorkingDiff ? "modified" : "clean"}
          </strong>
          <span className="telemetry-sub">visible vs committed</span>
        </div>
        <div className="telemetry-item">
          <span className="telemetry-label">Effects</span>
          <strong>{pendingCount} pending</strong>
          <span className={failedCount ? "telemetry-sub signal-bad" : "telemetry-sub"}>
            {failedCount} failed / superseded
          </span>
        </div>
        <div className="telemetry-item">
          <span className="telemetry-label">Invariant suite</span>
          <strong className={passedChecks === checks.length ? "signal-good" : "signal-bad"}>
            {passedChecks}/{checks.length} passing
          </strong>
          <span className="telemetry-sub">deterministic checks</span>
        </div>
      </section>

      <FailureControls />

      <div className="observability-grid">
        <OrderWorkspace />
        <TransactionTimeline />
        <div className="inspector-column">
          <TruthInspector />
          <VerificationPanel />
        </div>
      </div>

      <RegressionPanel />
      <ErrorToast />
    </main>
  );
}
