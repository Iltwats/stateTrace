import { useEffect, useRef } from "react";
import type { InvariantResult } from "../../domain/types";
import { TransactionTimeline } from "../TransactionTimeline/TransactionTimeline";

export function TraceDrawer({
  open,
  eventCount,
  checks,
  committedRevision,
  onClose,
}: {
  open: boolean;
  eventCount: number;
  checks: InvariantResult[];
  committedRevision: number;
  onClose: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="trace-drawer-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        className="trace-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="trace-drawer-title"
      >
        <header className="trace-drawer-header">
          <div>
            <p className="section-kicker">Human + agent trace</p>
            <h2 id="trace-drawer-title">Activity</h2>
          </div>
          <div className="trace-drawer-actions">
            <span className="event-count">{eventCount} events</span>
            <button
              ref={closeButtonRef}
              type="button"
              className="drawer-close"
              aria-label="Close activity"
              onClick={onClose}
            >
              ×
            </button>
          </div>
        </header>
        <div className="trace-drawer-body">
          <div className="drawer-summary" aria-label="Activity summary">
            <span><strong>r{committedRevision}</strong> current revision</span>
            <span><strong>{eventCount}</strong> events</span>
            <span>
              <strong>
                {checks.filter(({ passed }) => passed).length}/{checks.length}
              </strong>{" "}
              safety checks
            </span>
          </div>
          <TransactionTimeline />
        </div>
      </aside>
    </div>
  );
}
