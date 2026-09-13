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
          <div>
            <div className="field-title-line">
              <label htmlFor="field-shippingMethod">Shipping method</label>
              <span className={`field-actor actor-${lastActor ?? "shared"}`}>
                {locked
                  ? "Protected"
                  : lastActor
                    ? `${lastActor === "human" ? "You" : "Agent"} updated`
                    : "Shared"}
              </span>
            </div>
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
      {visibleValue !== committedValue || locked ? (
        <div className="field-footer">
          <span>
            {visibleValue !== committedValue
              ? "Agent change is being verified…"
              : "Only you can change this field"}
          </span>
        </div>
      ) : null}
    </div>
  );
}
