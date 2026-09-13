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
  const [draft, setDraft] = useState(committedValue);
  const isOptimistic = visibleValue !== committedValue;
  const isDirty = draft !== committedValue;
  const activeActor = isDirty ? "human" : lastActor;
  const actorLabel = locked
    ? "Human protected"
    : isDirty
      ? "Human draft"
      : activeActor
        ? `${activeActor === "human" ? "Human" : "Agent"} last edit`
        : "Human + agent";

  useEffect(() => {
    setDraft(committedValue);
  }, [committedValue]);

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
          <span className={`diff-prefix ${isOptimistic || isDirty ? "is-modified" : ""}`} aria-hidden="true">
            {isOptimistic || isDirty ? "M" : "·"}
          </span>
          <div>
            <div className="field-title-line">
              <label htmlFor={`field-${field}`}>{label}</label>
              <span className={`field-actor actor-${activeActor ?? "shared"}`}>
                {actorLabel}
              </span>
            </div>
            <code className="field-path">order.{field}</code>
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

      <div className="field-footer">
        <span>
          {isOptimistic
            ? `unstaged diff: ${visibleValue}`
            : locked
              ? "path protected by human lock"
              : "matches HEAD"}
        </span>
        {isDirty && !locked ? (
          <div className="inline-actions">
            <button
              type="button"
              className="button-ghost"
              onClick={() => setDraft(committedValue)}
            >
              Discard diff
            </button>
            <button
              type="button"
              className="button-secondary"
              onClick={() => onCommit(draft)}
            >
              Commit change
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
