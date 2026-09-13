import { useEffect, useState } from "react";
import type { Actor, MutableField } from "../../domain/types";
import { FieldLockButton } from "../Shared/FieldLockButton";

export function EditableField({
  field,
  label,
  committedValue,
  visibleValue,
  lastActor,
  locked,
  multiline = false,
  onCommit,
  onToggleLock,
}: {
  field: MutableField;
  label: string;
  committedValue: string;
  visibleValue: string;
  lastActor?: Actor;
  locked: boolean;
  multiline?: boolean;
  onCommit: (value: string) => void;
  onToggleLock: () => void;
}) {
  const [draft, setDraft] = useState(visibleValue);
  const isOptimistic = visibleValue !== committedValue;
  const isDirty = draft !== visibleValue;
  const activeActor = isDirty ? "human" : lastActor;
  const actorLabel = locked
    ? "Protected"
    : isDirty
      ? "Your draft"
      : activeActor
        ? `${activeActor === "human" ? "You" : "Agent"} updated`
        : "Shared";

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
              <span className={`field-actor actor-${activeActor ?? "shared"}`}>
                {actorLabel}
              </span>
            </div>
          </div>
        </div>
        <FieldLockButton
          locked={locked}
          fieldLabel={label}
          onClick={onToggleLock}
        />
      </div>

      {multiline ? (
        <textarea {...inputProps} rows={3} />
      ) : (
        <input {...inputProps} />
      )}

      {isOptimistic || locked || isDirty ? (
        <div className="field-footer">
          <span>
            {isOptimistic
              ? "Agent change is being verified…"
              : locked
                ? "Only you can change this field"
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
