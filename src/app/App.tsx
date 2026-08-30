import { ErrorToast } from "../components/ErrorToast/ErrorToast";
import { FailureControls } from "../components/FailureControls/FailureControls";
import { OrderWorkspace } from "../components/OrderWorkspace/OrderWorkspace";
import { TransactionTimeline } from "../components/TransactionTimeline/TransactionTimeline";
import { TruthInspector } from "../components/TruthInspector/TruthInspector";
import { VerificationPanel } from "../components/VerificationPanel/VerificationPanel";

export function App() {
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
          <span className="protocol-light" aria-hidden="true" />
          <div>
            <strong>Shared-state workspace</strong>
            <p>Human UI and semantic tools use one transaction engine.</p>
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
      <ErrorToast />
    </main>
  );
}
