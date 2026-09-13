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
          <span className={`protocol-light protocol-${status.state}`} aria-hidden="true" />
          <div>
            <strong>{connected ? "Connected" : "WebMCP is not available"}</strong>
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
      >
        <div className="landing-glow" aria-hidden="true" />
        <header className="landing-header">
          <div className="landing-monogram" aria-hidden="true">ST</div>
          <WebMCPBadge status={webMCP} onClick={() => setSetupOpen(true)} />
        </header>

        <section
          className="landing-hero"
          aria-labelledby="landing-title"
          onPointerEnter={(event) => {
            event.currentTarget.parentElement?.style.setProperty(
              "--landing-glow-opacity",
              "1",
            );
          }}
          onPointerMove={(event) => {
            const landing = event.currentTarget.parentElement;
            landing?.style.setProperty("--landing-glow-x", `${event.clientX}px`);
            landing?.style.setProperty("--landing-glow-y", `${event.clientY}px`);
          }}
          onPointerLeave={(event) => {
            event.currentTarget.parentElement?.style.setProperty(
              "--landing-glow-opacity",
              "0",
            );
          }}
        >
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
          <div className="landing-actions">
            <button
              type="button"
              className="open-demo-button"
              onClick={() => setDemoOpen(true)}
            >
              Open checkout demo
              <span aria-hidden="true">↗</span>
            </button>
            <a className="landing-scroll-link" href="#product-overview">
              See how it works
              <span aria-hidden="true">↓</span>
            </a>
          </div>
        </section>

        <section
          className="product-overview"
          id="product-overview"
          aria-labelledby="product-overview-title"
          onPointerEnter={(event) => {
            event.currentTarget.parentElement?.style.setProperty(
              "--landing-glow-opacity",
              "0",
            );
          }}
        >
          <div className="product-overview-heading">
            <p className="section-kicker">StateTrace in one glance</p>
            <h2 id="product-overview-title">
              See the whole agent transaction, not just the final field value.
            </h2>
          </div>
          <div className="capability-grid">
            <article className="capability-card">
              <span>01</span>
              <h3>Observe</h3>
              <p>Separate optimistic UI, pending work, and committed state.</p>
            </article>
            <article className="capability-card">
              <span>02</span>
              <h3>Protect</h3>
              <p>Reject stale or duplicate writes and respect human locks.</p>
            </article>
            <article className="capability-card">
              <span>03</span>
              <h3>Recover</h3>
              <p>Retry one failed transaction or restore an automatic checkpoint.</p>
            </article>
            <article className="capability-card">
              <span>04</span>
              <h3>Verify</h3>
              <p>Prove the final outcome with an ordered trace and deterministic checks.</p>
            </article>
          </div>
        </section>

        <section
          className="landing-faq"
          aria-labelledby="faq-title"
          onPointerEnter={(event) => {
            event.currentTarget.parentElement?.style.setProperty(
              "--landing-glow-opacity",
              "0",
            );
          }}
          onFocusCapture={(event) => {
            event.currentTarget.parentElement?.style.setProperty(
              "--landing-glow-opacity",
              "0",
            );
          }}
        >
          <div className="landing-faq-intro">
            <p className="section-kicker">What it does</p>
            <h2 id="faq-title">Frequently asked questions</h2>
            <p>
              A practical view of StateTrace, WebMCP, and what the checkout
              demo is designed to prove.
            </p>
          </div>
          <div className="landing-faq-list">
            <details>
              <summary>What does StateTrace make observable?</summary>
              <p>
                It records field-level changes with the responsible actor,
                previous value, new value, and revision—so you can distinguish
                what you changed from what an agent changed.
              </p>
            </details>
            <details>
              <summary>What can an agent do through WebMCP?</summary>
              <p>
                An agent can inspect current and pending state, read the ordered
                activity trace, verify exact outcomes, stage a supported field
                change, retry one failed transaction, and capture a recovered
                trace as a regression fixture.
              </p>
            </details>
            <details>
              <summary>How does it handle slow operations and latency?</summary>
              <p>
                StateTrace separates the value currently shown in the form
                from the last committed value. A slow operation stays visibly
                pending until it succeeds or fails, so neither the person nor
                the agent has to mistake an optimistic update for a completed
                one.
              </p>
            </details>
            <details>
              <summary>Can duplicate requests apply the same change twice?</summary>
              <p>
                Idempotency keys prevent duplicate logical writes. If a
                completion response arrives more than once, the extra response
                is ignored and recorded in the trace instead of advancing the
                revision again.
              </p>
            </details>
            <details>
              <summary>What if the page changes while an agent is working?</summary>
              <p>
                Agent writes include the revision they observed. Stale writes
                to the same field are rejected or superseded, while safe edits
                to independent fields can survive. A human can also lock a
                field so a pending agent operation cannot overwrite it.
              </p>
            </details>
            <details>
              <summary>Can a failed operation be retried safely?</summary>
              <p>
                Yes. Recovery targets one identified failed or superseded
                transaction at the current revision instead of repeating the
                whole workflow. Newer human edits and field locks remain in
                force.
              </p>
            </details>
            <details>
              <summary>Do I need to save checkpoints manually?</summary>
              <p>
                No. StateTrace creates a restore point automatically before a
                human or agent changes the form, keeping the experience free
                of save buttons.
              </p>
            </details>
            <details>
              <summary>What happens when I restore a checkpoint?</summary>
              <p>
                The form returns to the selected revision while the activity
                history remains available, so the recovery itself stays
                understandable and traceable.
              </p>
            </details>
            <details>
              <summary>Does StateTrace work on every website?</summary>
              <p>
                Not automatically. A website must integrate the StateTrace
                pattern and expose its actions through WebMCP. This checkout is
                a reference implementation developers can adapt to real forms.
              </p>
            </details>
          </div>
        </section>

        <footer className="landing-footer">
          <span>Open-source WebMCP reference experience</span>
          <a
            href="https://github.com/Iltwats/stateTrace"
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
