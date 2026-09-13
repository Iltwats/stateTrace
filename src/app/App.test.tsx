import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useStateTraceStore } from "../store/useStateTraceStore";
import { App } from "./App";

describe("App", () => {
  beforeEach(() => {
    useStateTraceStore.getState().reset();
  });

  afterEach(() => {
    useStateTraceStore.getState().reset();
  });

  it("renders the StateTrace product shell", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "StateTrace" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/inspect the working tree/i),
    ).toBeInTheDocument();
    expect(screen.getByText("order/ORD-2048")).toBeInTheDocument();
    expect(screen.getByText("Working tree ↔ HEAD")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open stack trace/i })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Stack trace" })).not.toBeInTheDocument();
  });

  it("opens the stack trace in a drawer and closes it with Escape", async () => {
    const user = userEvent.setup();
    render(<App />);

    const trigger = screen.getByRole("button", { name: /open stack trace/i });
    await user.click(trigger);

    expect(screen.getByRole("dialog", { name: "Stack trace" })).toBeInTheDocument();
    expect(screen.getByText("Commit graph")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close stack trace" })).toHaveFocus();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "Stack trace" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("lets the human commit and lock a shipping choice", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.selectOptions(
      screen.getByLabelText("Shipping method"),
      "pickup",
    );
    await user.click(screen.getByLabelText("Lock shipping method"));

    const state = useStateTraceStore.getState().state;
    expect(state.order.shippingMethod).toBe("pickup");
    expect(state.lockedFields).toContain("shippingMethod");
    expect(screen.getByLabelText("Unlock shipping method")).toBeInTheDocument();
  });

  it("captures and replays a regression fixture", async () => {
    const user = userEvent.setup();
    useStateTraceStore
      .getState()
      .commitHumanField("internalNote", "Captured regression note");
    render(<App />);

    await user.click(screen.getByRole("button", { name: /commit 1 event to fixture/i }));
    expect(useStateTraceStore.getState().state.savedFixtures).toHaveLength(1);
    expect(screen.getByText("Concurrent order recovery")).toBeInTheDocument();

    useStateTraceStore
      .getState()
      .commitHumanField("internalNote", "A later temporary note");
    await user.click(screen.getByRole("button", { name: "Replay" }));

    expect(useStateTraceStore.getState().state.order.internalNote).toBe(
      "Captured regression note",
    );
  });
});
