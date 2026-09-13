import { useState } from "react";
import { useStateTraceStore } from "../../store/useStateTraceStore";

function checkpointRevision(events: Array<{ revisionAfter: number }>) {
  return events.reduce(
    (latest, event) => Math.max(latest, event.revisionAfter),
    1,
  );
}

export function CheckpointPanel() {
  const state = useStateTraceStore(({ state }) => state);
  const saveFixture = useStateTraceStore(({ saveFixture }) => saveFixture);
  const restoreCheckpointState = useStateTraceStore(
    ({ restoreCheckpoint }) => restoreCheckpoint,
  );
  const [restoredId, setRestoredId] = useState<string | null>(null);

  function saveCheckpoint() {
    saveFixture({
      name: `Checkout checkpoint ${state.savedFixtures.length + 1}`,
      description: `Form details saved at revision ${state.committedRevision}.`,
      expectedOutcome: "recovered",
    });
  }

  function restoreCheckpoint(fixtureId: string) {
    if (restoreCheckpointState(fixtureId)) setRestoredId(fixtureId);
  }

  return (
    <section className="checkpoint-panel" aria-labelledby="checkpoint-heading">
      <div className="drawer-section-heading">
        <div>
          <p className="section-kicker">Form history</p>
          <h3 id="checkpoint-heading">Checkpoints</h3>
        </div>
        <button type="button" className="checkpoint-save" onClick={saveCheckpoint}>
          Save checkpoint
        </button>
      </div>
      <p className="checkpoint-help">
        Save the current form, then restore it after you or the agent makes changes.
      </p>

      {state.savedFixtures.length > 0 ? (
        <ul className="checkpoint-list">
          {[...state.savedFixtures].reverse().map((fixture) => (
            <li key={fixture.id}>
              <div>
                <strong>{fixture.name}</strong>
                <span>Revision {checkpointRevision(fixture.events)}</span>
              </div>
              <button
                type="button"
                className="checkpoint-restore"
                onClick={() => restoreCheckpoint(fixture.id)}
              >
                {restoredId === fixture.id ? "Restored" : "Restore"}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="checkpoint-empty">No checkpoints saved.</p>
      )}
    </section>
  );
}
