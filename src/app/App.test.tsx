import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RegressionPanel } from "../components/RegressionPanel/RegressionPanel";
import { useStateTraceStore } from "../store/useStateTraceStore";
import { App } from "./App";

describe("App", () => {
  beforeEach(() => {
    useStateTraceStore.getState().reset();
  });

  afterEach(() => {
    useStateTraceStore.getState().reset();
  });

  it("renders the focused StateTrace demo", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "StateTrace" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "One order. One agent. Every change visible.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Shipping details")).toBeInTheDocument();
    expect(screen.getByLabelText("Field editing model")).toHaveTextContent(
      "Your edit",
    );
    expect(screen.getByText(/update the shipping address/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^activity/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: "Activity" }),
    ).not.toBeInTheDocument();
  });

  it("opens activity in a drawer and closes it with Escape", async () => {
    const user = userEvent.setup();
    render(<App />);

    const trigger = screen.getByRole("button", { name: /^activity/i });
    await user.click(trigger);

    expect(screen.getByRole("dialog", { name: "Activity" })).toBeInTheDocument();
    expect(screen.getByText("Agent & human activity")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close activity" })).toHaveFocus();

    await user.keyboard("{Escape}");

    expect(
      screen.queryByRole("dialog", { name: "Activity" }),
    ).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("lets the human commit and protect a shipping choice", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.selectOptions(screen.getByLabelText("Shipping method"), "pickup");
    await user.click(screen.getByLabelText("Lock shipping method"));

    const state = useStateTraceStore.getState().state;
    expect(state.order.shippingMethod).toBe("pickup");
    expect(state.lockedFields).toContain("shippingMethod");
    expect(screen.getByLabelText("Unlock shipping method")).toBeInTheDocument();
    expect(screen.getByText("Protected")).toBeInTheDocument();
  });

  it("previews an agent update in the same observable state", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      screen.getByRole("button", { name: "Preview agent update" }),
    );

    expect(
      await screen.findByDisplayValue("44 River Road, Portland, OR 97209"),
    ).toBeInTheDocument();
    expect(screen.getByText("Agent updated")).toBeInTheDocument();
    expect(useStateTraceStore.getState().state.transactions[0]?.actor).toBe(
      "agent",
    );
  });

  it("captures and replays a regression fixture", async () => {
    const user = userEvent.setup();
    useStateTraceStore
      .getState()
      .commitHumanField("internalNote", "Captured regression note");
    render(<RegressionPanel />);

    await user.click(
      screen.getByRole("button", { name: /commit 1 event to fixture/i }),
    );
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
