import { useState } from "react";
import { useStateTraceStore } from "../../store/useStateTraceStore";

export function CheckpointPanel() {
  const checkpoints = useStateTraceStore(({ state }) => state.checkpoints);
  const restoreCheckpointState = useStateTraceStore(
    ({ restoreCheckpoint }) => restoreCheckpoint,
  );
  const [restoredId, setRestoredId] = useState<string | null>(null);

  function restoreCheckpoint(fixtureId: string) {
    if (restoreCheckpointState(fixtureId)) setRestoredId(fixtureId);
  }

  return (
    <section className="checkpoint-panel" aria-labelledby="checkpoint-heading">
      <div className="drawer-section-heading">
        <div>
          <p className="section-kicker">Automatic form history</p>
          <h3 id="checkpoint-heading">Restore points</h3>
        </div>
        <span className="auto-save-state">
          <i aria-hidden="true" />
          Auto-saved
        </span>
      </div>
      <p className="checkpoint-help">
        A restore point is created automatically before you or the agent changes
        the form.
      </p>

      {checkpoints.length > 0 ? (
        <ul className="checkpoint-list">
          {[...checkpoints].reverse().map((checkpoint) => (
            <li key={checkpoint.id}>
              <div>
                <strong>{checkpoint.name}</strong>
                <span>{checkpoint.description}</span>
                <small>Revision {checkpoint.revision}</small>
              </div>
              <button
                type="button"
                className="checkpoint-restore"
                onClick={() => restoreCheckpoint(checkpoint.id)}
              >
                {restoredId === checkpoint.id ? "Restored" : "Restore"}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="checkpoint-empty">
          Your first restore point will appear when a checkout field changes.
        </p>
      )}
    </section>
  );
}
