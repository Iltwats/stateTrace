import { useStateTraceStore } from "../../store/useStateTraceStore";

export function ErrorToast() {
  const error = useStateTraceStore(({ lastError }) => lastError);
  const clearError = useStateTraceStore(({ clearError }) => clearError);

  if (!error) return null;

  return (
    <div className="error-toast" role="alert">
      <div>
        <strong>{error.code.replaceAll("_", " ")}</strong>
        <p>{error.message}</p>
      </div>
      <button type="button" aria-label="Dismiss error" onClick={clearError}>
        ×
      </button>
    </div>
  );
}

