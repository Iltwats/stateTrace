import type { StateTraceState } from "../domain/types";

export function selectPendingCount(state: StateTraceState) {
  return state.transactions.filter(({ status }) => status === "pending").length;
}

export function selectFailedCount(state: StateTraceState) {
  return state.transactions.filter(({ status }) => status === "failed" || status === "superseded")
    .length;
}

export function selectLatestRetryable(state: StateTraceState) {
  return [...state.transactions]
    .reverse()
    .find(({ status }) => status === "failed" || status === "superseded");
}
