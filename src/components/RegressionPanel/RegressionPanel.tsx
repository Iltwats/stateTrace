import { useState } from "react";
import type { FormEvent } from "react";
import type { RegressionFixture } from "../../domain/types";
import { useStateTraceStore } from "../../store/useStateTraceStore";

const outcomeLabels: Record<RegressionFixture["expectedOutcome"], string> = {
  recovered: "Recovered",
  conflict_detected: "Conflict detected",
  write_failed: "Write failed safely",
};

export function RegressionPanel() {
  const events = useStateTraceStore(({ state }) => state.events);
  const fixtures = useStateTraceStore(({ state }) => state.savedFixtures);
  const saveFixture = useStateTraceStore(({ saveFixture }) => saveFixture);
  const replayFixture = useStateTraceStore(({ replayFixture }) => replayFixture);
  const [name, setName] = useState("Concurrent order recovery");
  const [description, setDescription] = useState(
    "Preserve the human shipping choice while recovering the failed address write.",
  );
  const [expectedOutcome, setExpectedOutcome] =
    useState<RegressionFixture["expectedOutcome"]>("recovered");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    saveFixture({ name, description, expectedOutcome });
  }

  return (
    <section className="panel regression-panel" aria-labelledby="regression-heading">
      <div className="panel-heading compact">
        <div>
          <p className="section-kicker">Repeatable evidence</p>
          <h2 id="regression-heading">Regression library</h2>
        </div>
        <span className="event-count">{fixtures.length} saved</span>
      </div>

      <div className="regression-grid">
        <form className="fixture-form" onSubmit={handleSubmit}>
          <div>
            <strong>Capture the current trace</strong>
            <p>
              Save its starting order, actions, failure evidence, and expected
              outcome as a deterministic fixture.
            </p>
          </div>
          <label>
            Fixture name
            <input
              value={name}
              maxLength={80}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            Description
            <textarea
              rows={3}
              value={description}
              maxLength={240}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <label>
            Expected outcome
            <select
              value={expectedOutcome}
              onChange={(event) =>
                setExpectedOutcome(
                  event.target.value as RegressionFixture["expectedOutcome"],
                )
              }
            >
              {Object.entries(outcomeLabels).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button className="button-primary" type="submit" disabled={!events.length}>
            Save {events.length} event{events.length === 1 ? "" : "s"} as fixture
          </button>
        </form>

        <div className="fixture-library">
          {fixtures.length === 0 ? (
            <div className="empty-state compact-empty">
              <span className="empty-glyph" aria-hidden="true">↻</span>
              <strong>No regression fixtures yet</strong>
              <p>Complete a trace, then capture it here or through WebMCP.</p>
            </div>
          ) : (
            <ul className="fixture-list">
              {fixtures.map((fixture) => (
                <li key={fixture.id}>
                  <div className="fixture-card-heading">
                    <div>
                      <strong>{fixture.name}</strong>
                      <span>{outcomeLabels[fixture.expectedOutcome]}</span>
                    </div>
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() => replayFixture(fixture.id)}
                    >
                      Replay
                    </button>
                  </div>
                  <p>{fixture.description}</p>
                  <div className="fixture-meta">
                    <span>{fixture.events.length} captured events</span>
                    <span>{fixture.startingOrder.id}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

