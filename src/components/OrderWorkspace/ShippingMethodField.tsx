import type { Actor, ShippingMethod } from "../../domain/types";

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
}: {
  committedValue: ShippingMethod;
  visibleValue: ShippingMethod;
  lastActor?: Actor;
  locked: boolean;
  onCommit: (value: ShippingMethod) => void;
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
              {lastActor ? (
                <span className={`field-actor actor-${lastActor}`}>
                  {lastActor === "human" ? "You" : "Agent"} updated
                </span>
              ) : null}
            </div>
          </div>
        </div>
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
      {visibleValue !== committedValue ? (
        <div className="field-footer">
          <span>
            Agent change is being verified…
          </span>
        </div>
      ) : null}
    </div>
  );
}
