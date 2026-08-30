import type { TransactionStatus } from "../../domain/types";

type Status = TransactionStatus | "verified" | "diverged" | "available";

export function StatusPill({ status, label }: { status: Status; label?: string }) {
  return (
    <span className={`status-pill status-${status}`}>
      <span className="pill-dot" aria-hidden="true" />
      {label ?? status.replaceAll("_", " ")}
    </span>
  );
}

