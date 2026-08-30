import type { MutableField } from "../../domain/types";
import { verifyInvariants } from "../../engine/invariantEngine";
import {
  selectFailedCount,
  selectPendingCount,
} from "../../store/selectors";
import { useStateTraceStore } from "../../store/useStateTraceStore";
import { StatusPill } from "../Shared/StatusPill";

const fieldLabels: Record<MutableField, string> = {
  shippingAddress: "address",
  shippingMethod: "shipping",
  internalNote: "note",
};

export function TruthInspector() {
  const state = useStateTraceStore(({ state }) => state);
  const pendingCount = selectPendingCount(state);
  const failedCount = selectFailedCount(state);
  const checks = verifyInvariants(state);
  const allPassed = checks.every(({ passed }) => passed);
  const fields = Object.keys(fieldLabels) as MutableField[];

  return (
    <section className="panel truth-inspector" aria-labelledby="truth-heading">
      <div className="panel-heading compact">
        <div>
          <p className="section-kicker">git diff --stat</p>
          <h2 id="truth-heading">Working tree ↔ HEAD</h2>
        </div>
        <StatusPill
          status={allPassed ? "verified" : "diverged"}
          label={allPassed ? "Verified" : "Review"}
        />
      </div>

      <div className="metric-grid">
        <div className="metric-card">
          <span>HEAD revision</span>
          <strong>r{state.committedRevision}</strong>
        </div>
        <div className="metric-card">
          <span>In-flight</span>
          <strong>{pendingCount}</strong>
        </div>
        <div className="metric-card">
          <span>Exceptions</span>
          <strong>{failedCount}</strong>
        </div>
      </div>

      <div className="truth-table" role="table" aria-label="Working tree and HEAD state">
        <div className="truth-row truth-header" role="row">
          <span role="columnheader">Path</span>
          <span role="columnheader">Working tree</span>
          <span role="columnheader">HEAD</span>
        </div>
        {fields.map((field) => {
          const diverged = state.visibleOrder[field] !== state.order[field];
          return (
            <div className={`truth-row ${diverged ? "has-diff" : ""}`} role="row" key={field}>
              <strong role="cell">{fieldLabels[field]}</strong>
              <span role="cell" title={state.visibleOrder[field]}>
                {state.visibleOrder[field]}
              </span>
              <span role="cell" title={state.order[field]}>
                {state.order[field]}
              </span>
            </div>
          );
        })}
      </div>

      <div className="lock-summary">
        <span>Protected paths</span>
        <strong>
          {state.lockedFields.length
            ? state.lockedFields.map((field) => fieldLabels[field]).join(", ")
            : "None"}
        </strong>
      </div>
    </section>
  );
}
