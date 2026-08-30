import { verifyInvariants } from "../../engine/invariantEngine";
import { useStateTraceStore } from "../../store/useStateTraceStore";

export function VerificationPanel() {
  const state = useStateTraceStore(({ state }) => state);
  const checks = verifyInvariants(state);
  const passed = checks.filter((check) => check.passed).length;

  return (
    <section className="panel verification-panel" aria-labelledby="verification-heading">
      <div className="panel-heading compact">
        <div>
          <p className="section-kicker">Deterministic checks</p>
          <h2 id="verification-heading">Postconditions</h2>
        </div>
        <strong className="verification-score">
          {passed}/{checks.length}
        </strong>
      </div>
      <ul className="check-list">
        {checks.map((check) => (
          <li className={check.passed ? "check-pass" : "check-fail"} key={check.id}>
            <span className="check-icon" aria-hidden="true">
              {check.passed ? "✓" : "!"}
            </span>
            <div>
              <strong>{check.label}</strong>
              <p>{check.evidence}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

