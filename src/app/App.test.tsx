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
      screen.getByText(/what actually committed/i),
    ).toBeInTheDocument();
    expect(screen.getByText("ORD-2048")).toBeInTheDocument();
    expect(screen.getByText("State inspector")).toBeInTheDocument();
    expect(screen.getByText("Transaction timeline")).toBeInTheDocument();
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
});
