import { useEffect, useState } from "react";
import type { MutableField } from "../../domain/types";
import { FieldLockButton } from "../Shared/FieldLockButton";

export function EditableField({
  field,
  label,
  committedValue,
  visibleValue,
  locked,
  multiline = false,
  onCommit,
  onToggleLock,
}: {
  field: MutableField;
  label: string;
  committedValue: string;
  visibleValue: string;
  locked: boolean;
  multiline?: boolean;
  onCommit: (value: string) => void;
  onToggleLock: () => void;
}) {
  const [draft, setDraft] = useState(committedValue);
  const isOptimistic = visibleValue !== committedValue;
  const isDirty = draft !== committedValue;

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
        <label htmlFor={`field-${field}`}>{label}</label>
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
            ? `Pending view: ${visibleValue}`
            : locked
              ? "Protected from human and agent writes"
              : "Committed value"}
        </span>
        {isDirty && !locked ? (
          <div className="inline-actions">
            <button
              type="button"
              className="button-ghost"
              onClick={() => setDraft(committedValue)}
            >
              Discard
            </button>
            <button
              type="button"
              className="button-secondary"
              onClick={() => onCommit(draft)}
            >
              Commit edit
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
