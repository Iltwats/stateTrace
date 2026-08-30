import type { ShippingMethod } from "../../domain/types";
import { FieldLockButton } from "../Shared/FieldLockButton";

const labels: Record<ShippingMethod, string> = {
  standard: "Standard · 4–6 days",
  express: "Express · 1–2 days",
  pickup: "Local pickup",
};

export function ShippingMethodField({
  committedValue,
  visibleValue,
  locked,
  onCommit,
  onToggleLock,
}: {
  committedValue: ShippingMethod;
  visibleValue: ShippingMethod;
  locked: boolean;
  onCommit: (value: ShippingMethod) => void;
  onToggleLock: () => void;
}) {
  return (
    <div
      className={`editable-field ${visibleValue !== committedValue ? "is-optimistic" : ""}`}
    >
      <div className="field-heading">
        <label htmlFor="field-shippingMethod">Shipping method</label>
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
            ? `Pending view: ${labels[visibleValue]}`
            : locked
              ? "Protected from human and agent writes"
              : "Committed value"}
        </span>
      </div>
    </div>
  );
}
