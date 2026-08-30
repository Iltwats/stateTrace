import { ErrorToast } from "../components/ErrorToast/ErrorToast";
import { FailureControls } from "../components/FailureControls/FailureControls";
import { OrderWorkspace } from "../components/OrderWorkspace/OrderWorkspace";
import { RegressionPanel } from "../components/RegressionPanel/RegressionPanel";
import { TransactionTimeline } from "../components/TransactionTimeline/TransactionTimeline";
import { TruthInspector } from "../components/TruthInspector/TruthInspector";
import { VerificationPanel } from "../components/VerificationPanel/VerificationPanel";
import { useWebMCPTools } from "../webmcp/useWebMCPTools";

export function App() {
  const webMCP = useWebMCPTools();

  return (
    <main className="app-shell">
      <header className="hero-panel">
        <div>
          <p className="eyebrow">WebMCP transaction observatory</p>
          <h1>StateTrace</h1>
          <p className="hero-copy">
            See what the interface claims, what actually committed, and what an
            agent should do next.
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

      <FailureControls />

      <div className="workspace-grid">
        <OrderWorkspace />
        <div className="inspector-column">
          <TruthInspector />
          <VerificationPanel />
        </div>
      </div>

      <TransactionTimeline />
      <RegressionPanel />
      <ErrorToast />
    </main>
  );
}
