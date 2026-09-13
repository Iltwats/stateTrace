export function FieldLockButton({
  locked,
  fieldLabel,
  onClick,
}: {
  locked: boolean;
  fieldLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`lock-button ${locked ? "is-locked" : ""}`}
      aria-pressed={locked}
      aria-label={`${locked ? "Unlock" : "Lock"} ${fieldLabel}`}
      onClick={onClick}
    >
      <span aria-hidden="true">{locked ? "◆" : "◇"}</span>
      {locked ? "Locked" : "Lock"}
    </button>
  );
}
