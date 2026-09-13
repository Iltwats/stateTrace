import { useEffect, useState } from "react";
import { registerStateTraceTools } from "./registerTools";

export type WebMCPStatus =
  | { state: "checking"; toolCount: 0 }
  | { state: "available"; toolCount: number }
  | { state: "unavailable"; toolCount: 0; error?: string };

export function useWebMCPTools(): WebMCPStatus {
  const [status, setStatus] = useState<WebMCPStatus>({
    state: "checking",
    toolCount: 0,
  });

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};

    void registerStateTraceTools().then((registration) => {
      cleanup = registration.cleanup;
      if (disposed) {
        cleanup();
        return;
      }

      setStatus(
        registration.supported
          ? {
              state: "available",
              toolCount: registration.registeredToolNames.length,
            }
          : {
              state: "unavailable",
              toolCount: 0,
              error: registration.error,
            },
      );
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return status;
}
