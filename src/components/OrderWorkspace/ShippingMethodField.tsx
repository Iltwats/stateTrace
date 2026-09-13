import type { Actor, ShippingMethod } from "../../domain/types";
import { FieldLockButton } from "../Shared/FieldLockButton";

const labels: Record<ShippingMethod, string> = {
  standard: "Standard · 4–6 days",
  express: "Express · 1–2 days",
  pickup: "Local pickup",
};

export function ShippingMethodField({
  committedValue,
  visibleValue,
  lastActor,
  locked,
  onCommit,
  onToggleLock,
}: {
  committedValue: ShippingMethod;
  visibleValue: ShippingMethod;
  lastActor?: Actor;
  locked: boolean;
  onCommit: (value: ShippingMethod) => void;
  onToggleLock: () => void;
}) {
  return (
    <div
      className={`editable-field ${visibleValue !== committedValue ? "is-optimistic" : ""}`}
    >
      <div className="field-heading">
        <div className="field-identity">
          <span className={`diff-prefix ${visibleValue !== committedValue ? "is-modified" : ""}`} aria-hidden="true">
            {visibleValue !== committedValue ? "M" : "·"}
          </span>
          <div>
            <div className="field-title-line">
              <label htmlFor="field-shippingMethod">Shipping method</label>
              <span className={`field-actor actor-${lastActor ?? "shared"}`}>
                {locked
                  ? "Human protected"
                  : lastActor
                    ? `${lastActor === "human" ? "Human" : "Agent"} last edit`
                    : "Human + agent"}
              </span>
            </div>
            <code className="field-path">order.shippingMethod</code>
          </div>
        </div>
        <FieldLockButton
          locked={locked}
          fieldLabel="shipping method"
          onClick={onToggleLock}
        />
      </div>
      <select
        id="field-shippingMethod"
        value={visibleValue}
        disabled={locked}
        onChange={(event) => onCommit(event.target.value as ShippingMethod)}
      >
        {Object.entries(labels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <div className="field-footer">
        <span>
          {visibleValue !== committedValue
            ? `unstaged diff: ${labels[visibleValue]}`
            : locked
              ? "path protected by human lock"
              : "matches HEAD"}
        </span>
      </div>
    </div>
  );
}
