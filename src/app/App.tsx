import { useCallback, useEffect, useRef, useState } from "react";
import { getVisibleActivityCount } from "../components/ActivityFeed/ActivityFeed";
import { AgentDemo } from "../components/AgentDemo/AgentDemo";
import { ErrorToast } from "../components/ErrorToast/ErrorToast";
import { OrderWorkspace } from "../components/OrderWorkspace/OrderWorkspace";
import { TraceDrawer } from "../components/TraceDrawer/TraceDrawer";
import { useStateTraceStore } from "../store/useStateTraceStore";
import type { WebMCPStatus } from "../webmcp/useWebMCPTools";
import { useWebMCPTools } from "../webmcp/useWebMCPTools";

function WebMCPBadge({
  status,
  onClick,
}: {
  status: WebMCPStatus;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`connection-pill connection-${status.state}`}
      aria-haspopup="dialog"
      onClick={onClick}
    >
      <span
        className={`protocol-light protocol-${status.state}`}
        aria-hidden="true"
      />
      <span>
        {status.state === "available"
          ? `WebMCP connected · ${status.toolCount} tools`
          : status.state === "checking"
            ? "Checking WebMCP"
            : "WebMCP unavailable"}
      </span>
    </button>
  );
}

function WebMCPSetupDialog({
  open,
  status,
  onClose,
}: {
  open: boolean;
  status: WebMCPStatus;
  onClose: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  if (!open) return null;

  const connected = status.state === "available";

  return (
    <div className="webmcp-setup-overlay" role="presentation">
      <section
        className="webmcp-setup-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="webmcp-setup-title"
        aria-describedby="webmcp-setup-description"
      >
        <div className="webmcp-setup-heading">
          <div>
            <p className="section-kicker">Browser setup</p>
            <h2 id="webmcp-setup-title">Enable WebMCP</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="webmcp-setup-close"
            onClick={onClose}
            aria-label="Close WebMCP setup"
          >
            ×
          </button>
        </div>

        <div className={`webmcp-current-status status-${status.state}`}>
          <div>
            <div className="webmcp-status-label">
              <span className={`protocol-light protocol-${status.state}`} aria-hidden="true" />
              <strong>{connected ? "Connected" : "WebMCP is not available"}</strong>
            </div>
            <p id="webmcp-setup-description">
              {connected
                ? `${status.toolCount} StateTrace tools are registered in this browser.`
                : "The checkout still works manually. Follow these steps to let an agent use its page tools."}
            </p>
          </div>
        </div>

        <ol className="webmcp-setup-steps">
          <li><span>1</span><p>Use <strong>Chrome 149 or later</strong>.</p></li>
          <li>
            <span>2</span>
            <p>Open <code>chrome://flags/#enable-webmcp-testing</code>.</p>
          </li>
          <li><span>3</span><p>Set <strong>WebMCP testing</strong> to Enabled.</p></li>
          <li><span>4</span><p>Relaunch Chrome, then reopen this page.</p></li>
        </ol>

        <p className="webmcp-setup-note">
          When setup is complete, this badge turns green and reports the
          number of tools available to your agent.
        </p>
        <button type="button" className="webmcp-setup-done" onClick={onClose}>
          {connected ? "Done" : "Continue in manual mode"}
        </button>
      </section>
    </div>
  );
}

export function App() {
  const webMCP = useWebMCPTools();
  const [demoOpen, setDemoOpen] = useState(false);
  const [traceOpen, setTraceOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const closeTrace = useCallback(() => setTraceOpen(false), []);
  const closeSetup = useCallback(() => setSetupOpen(false), []);
  const state = useStateTraceStore(({ state }) => state);
  const activityCount = getVisibleActivityCount(state);

  useEffect(() => {
    if (demoOpen && webMCP.state === "unavailable") setSetupOpen(true);
  }, [demoOpen, webMCP.state]);

  if (!demoOpen) {
    return (
      <main
        className="landing-shell"
        onPointerMove={(event) => {
          event.currentTarget.style.setProperty(
            "--landing-glow-x",
            `${event.clientX}px`,
          );
          event.currentTarget.style.setProperty(
            "--landing-glow-y",
            `${event.clientY}px`,
          );
        }}
      >
        <div className="landing-glow" aria-hidden="true" />
        <header className="landing-header">
          <div className="landing-monogram" aria-hidden="true">ST</div>
          <WebMCPBadge status={webMCP} onClick={() => setSetupOpen(true)} />
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
        <WebMCPSetupDialog
          open={setupOpen}
          status={webMCP}
          onClose={closeSetup}
        />
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
          <WebMCPBadge status={webMCP} onClick={() => setSetupOpen(true)} />
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
      <WebMCPSetupDialog
        open={setupOpen}
        status={webMCP}
        onClose={closeSetup}
      />
    </main>
  );
}
