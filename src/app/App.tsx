import { useCallback, useState } from "react";
import { getVisibleActivityCount } from "../components/ActivityFeed/ActivityFeed";
import { AgentDemo } from "../components/AgentDemo/AgentDemo";
import { ErrorToast } from "../components/ErrorToast/ErrorToast";
import { OrderWorkspace } from "../components/OrderWorkspace/OrderWorkspace";
import { TraceDrawer } from "../components/TraceDrawer/TraceDrawer";
import { useStateTraceStore } from "../store/useStateTraceStore";
import type { WebMCPStatus } from "../webmcp/useWebMCPTools";
import { useWebMCPTools } from "../webmcp/useWebMCPTools";

function WebMCPBadge({ status }: { status: WebMCPStatus }) {
  return (
    <div className={`connection-pill connection-${status.state}`}>
      <span
        className={`protocol-light protocol-${status.state}`}
        aria-hidden="true"
      />
      <span>
        {status.state === "available"
          ? `WebMCP connected · ${status.toolCount} tools`
          : status.state === "checking"
            ? "Checking WebMCP"
            : "Manual demo mode"}
      </span>
    </div>
  );
}

export function App() {
  const webMCP = useWebMCPTools();
  const [demoOpen, setDemoOpen] = useState(false);
  const [traceOpen, setTraceOpen] = useState(false);
  const closeTrace = useCallback(() => setTraceOpen(false), []);
  const state = useStateTraceStore(({ state }) => state);
  const activityCount = getVisibleActivityCount(state);

  if (!demoOpen) {
    return (
      <main className="landing-shell">
        <div className="landing-glow" aria-hidden="true" />
        <header className="landing-header">
          <div className="landing-monogram" aria-hidden="true">ST</div>
          <WebMCPBadge status={webMCP} />
        </header>

        <section className="landing-hero" aria-labelledby="landing-title">
          <p className="landing-kicker">Human-visible agent actions</p>
          <h1 id="landing-title" className="animated-title">
            <span>State</span><span>Trace</span>
          </h1>
          <p className="landing-tagline">
            Observability for agent updates in WebMCP.
          </p>
          <p className="landing-description">
            See exactly what you changed, what the agent changed, and return
            your form to any saved checkpoint.
          </p>
          <button
            type="button"
            className="open-demo-button"
            onClick={() => setDemoOpen(true)}
          >
            Open checkout demo
            <span aria-hidden="true">↗</span>
          </button>
        </section>

        <div className="landing-preview" aria-hidden="true">
          <span className="preview-line preview-line-one" />
          <span className="preview-line preview-line-two" />
          <span className="preview-orbit">A</span>
          <span className="preview-orbit preview-human">Y</span>
        </div>

        <footer className="landing-footer">
          <span>Open-source WebMCP reference experience</span>
          <a
            href="https://github.com/Iltwats/web-mcp-openai"
            target="_blank"
            rel="noreferrer"
          >
            GitHub ↗
          </a>
        </footer>
      </main>
    );
  }

  return (
    <main className="checkout-shell">
      <header className="commerce-header">
        <div className="commerce-header-main">
          <button
            type="button"
            className="commerce-brand"
            onClick={() => setDemoOpen(false)}
            aria-label="Back to StateTrace overview"
          >
            <span aria-hidden="true">A</span>
            <strong>AURUM</strong>
          </button>

          <nav className="commerce-navigation" aria-label="Store navigation">
            <a href="#checkout-products">New arrivals</a>
            <a href="#checkout-products">Lighting</a>
            <a href="#checkout-products">Accessories</a>
          </nav>

          <div className="checkout-header-actions">
            <span className="secure-checkout-label">
              <i aria-hidden="true">⌾</i>
              Secure checkout
            </span>
            <button
              type="button"
              className="activity-button"
              aria-haspopup="dialog"
              onClick={() => setTraceOpen(true)}
            >
              Activity
              <span>{activityCount}</span>
            </button>
          </div>
        </div>
        <div className="commerce-observer-bar">
          <WebMCPBadge status={webMCP} />
          <span>Agent changes are recorded automatically by StateTrace</span>
        </div>
      </header>

      <div className="checkout-content">
        <nav className="checkout-progress" aria-label="Checkout progress">
          <ol>
            <li className="is-complete"><span>✓</span>Bag</li>
            <li className="is-current"><span>2</span>Information</li>
            <li><span>3</span>Delivery</li>
            <li><span>4</span>Payment</li>
          </ol>
        </nav>

        <div className="checkout-intro">
          <div>
            <p className="eyebrow">Aurum online store</p>
            <h1>Checkout</h1>
          </div>
          <p>
            Complete your details below. Every edit is auto-saved, whether it
            comes from you or your WebMCP agent.
          </p>
        </div>

        <AgentDemo />
        <OrderWorkspace />

        <footer className="checkout-footer">
          <button type="button" onClick={() => setDemoOpen(false)}>
            ← Back to StateTrace
          </button>
          <span>Privacy · Terms · Help</span>
          <span>Demo store · No order or payment is submitted</span>
        </footer>
      </div>

      <ErrorToast />
      <TraceDrawer
        open={traceOpen}
        eventCount={activityCount}
        onClose={closeTrace}
      />
    </main>
  );
}
