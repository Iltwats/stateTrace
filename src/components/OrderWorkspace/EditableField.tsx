import { useEffect, useState } from "react";
import type { Actor, MutableField } from "../../domain/types";

function validateDraft(field: MutableField, value: string) {
  const trimmed = value.trim();

  if (field === "customerEmail") {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
      ? null
      : "Enter a valid email to auto-save";
  }
  if (field === "couponCode") {
    return trimmed.length <= 32
      ? null
      : "Use 32 characters or fewer to auto-save";
  }

  const maxLength =
    field === "internalNote" ? 400 : field === "paymentName" ? 100 : 240;
  return trimmed && trimmed.length <= maxLength
    ? null
    : `Enter between 1 and ${maxLength} characters to auto-save`;
}

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
  const draftError = validateDraft(field, draft);
  const activeActor = isDirty ? "human" : lastActor;
  const actorLabel = isDirty
    ? "Your draft"
    : activeActor
      ? `${activeActor === "human" ? "You" : "Agent"} updated`
      : null;

  useEffect(() => {
    setDraft(visibleValue);
  }, [visibleValue]);

  useEffect(() => {
    if (!isDirty || locked || draftError) return;

    const timeoutId = window.setTimeout(() => onCommit(draft), 650);
    return () => window.clearTimeout(timeoutId);
  }, [draft, draftError, isDirty, locked, onCommit]);

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
        <div className="field-footer" aria-live="polite">
          <span className={draftError ? "field-save-error" : undefined}>
            {isOptimistic
              ? "Agent change is being applied…"
              : draftError ?? "Auto-saving…"}
          </span>
        </div>
      ) : null}
    </div>
  );
}
