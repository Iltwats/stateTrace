import { useEffect, useRef } from "react";
import { ActivityFeed } from "../ActivityFeed/ActivityFeed";
import { CheckpointPanel } from "../CheckpointPanel/CheckpointPanel";

export function TraceDrawer({
  open,
  eventCount,
  onClose,
}: {
  open: boolean;
  eventCount: number;
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
            <span className="event-count">
              {eventCount} change{eventCount === 1 ? "" : "s"}
            </span>
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
          <ActivityFeed />
          <CheckpointPanel />
        </div>
      </aside>
    </div>
  );
}
