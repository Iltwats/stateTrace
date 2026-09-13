import { useEffect, useState } from "react";
import type { Actor, MutableField } from "../../domain/types";

export function EditableField({
  field,
  label,
  committedValue,
  visibleValue,
  lastActor,
  locked,
  multiline = false,
  onCommit,
}: {
  field: MutableField;
  label: string;
  committedValue: string;
  visibleValue: string;
  lastActor?: Actor;
  locked: boolean;
  multiline?: boolean;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(visibleValue);
  const isOptimistic = visibleValue !== committedValue;
  const isDirty = draft !== visibleValue;
  const activeActor = isDirty ? "human" : lastActor;
  const actorLabel = isDirty
      ? "Your draft"
      : activeActor
        ? `${activeActor === "human" ? "You" : "Agent"} updated`
        : null;

  useEffect(() => {
    setDraft(visibleValue);
  }, [visibleValue]);

  const inputProps = {
    id: `field-${field}`,
    value: draft,
    disabled: locked,
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => setDraft(event.target.value),
  };

  return (
    <div className={`editable-field ${isOptimistic ? "is-optimistic" : ""}`}>
      <div className="field-heading">
        <div className="field-identity">
          <div>
            <div className="field-title-line">
              <label htmlFor={`field-${field}`}>{label}</label>
              {actorLabel ? (
                <span className={`field-actor actor-${activeActor ?? "shared"}`}>
                  {actorLabel}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {multiline ? (
        <textarea {...inputProps} rows={3} />
      ) : (
        <input {...inputProps} />
      )}

      {isOptimistic || isDirty ? (
        <div className="field-footer">
          <span>
            {isOptimistic
              ? "Agent change is being verified…"
              : "Unsaved change"}
          </span>
          {isDirty && !locked ? (
            <div className="inline-actions">
              <button
                type="button"
                className="quiet-button"
                onClick={() => setDraft(visibleValue)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="secondary-action"
                onClick={() => onCommit(draft)}
              >
                Save change
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
