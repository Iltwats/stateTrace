import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { useStateTraceStore } from "../store/useStateTraceStore";
import { App } from "./App";

const { mockUseWebMCPTools } = vi.hoisted(() => ({
  mockUseWebMCPTools: vi.fn(),
}));

vi.mock("../webmcp/useWebMCPTools", () => ({
  useWebMCPTools: mockUseWebMCPTools,
}));

async function openCheckout(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole("button", { name: "Open checkout demo" }),
  );
}

describe("App", () => {
  beforeEach(() => {
    mockUseWebMCPTools.mockReturnValue({ state: "available", toolCount: 6 });
    useStateTraceStore.getState().reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    useStateTraceStore.getState().reset();
  });

  it("opens with the StateTrace observability story", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "StateTrace" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Observability for agent updates in WebMCP."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open checkout demo" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Checkout" })).not.toBeInTheDocument();
  });

  it("moves the landing glow with the pointer", () => {
    render(<App />);

    const landing = screen.getByRole("main");
    fireEvent.pointerMove(landing, { clientX: 320, clientY: 180 });

    expect(landing).toHaveStyle({
      "--landing-glow-x": "320px",
      "--landing-glow-y": "180px",
    });
  });

  it("opens WebMCP setup steps when the connected badge is clicked", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      screen.getByRole("button", { name: "WebMCP connected · 6 tools" }),
    );

    expect(screen.getByRole("dialog", { name: "Enable WebMCP" })).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(
      screen.getByText("chrome://flags/#enable-webmcp-testing"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close WebMCP setup" })).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("dialog", { name: "Enable WebMCP" }),
    ).not.toBeInTheDocument();
  });

  it("automatically shows setup on the demo when WebMCP is unavailable", async () => {
    mockUseWebMCPTools.mockReturnValue({
      state: "unavailable",
      toolCount: 0,
      error: "WebMCP is not supported",
    });
    const user = userEvent.setup();
    render(<App />);

    expect(
      screen.queryByRole("dialog", { name: "Enable WebMCP" }),
    ).not.toBeInTheDocument();
    await openCheckout(user);

    expect(screen.getByRole("dialog", { name: "Enable WebMCP" })).toBeInTheDocument();
    expect(screen.getByText("WebMCP is not available")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Continue in manual mode" }),
    ).toBeInTheDocument();
  });

  it("opens a complete ecommerce checkout demo", async () => {
    const user = userEvent.setup();
    render(<App />);

    await openCheckout(user);

    expect(screen.getByRole("heading", { name: "Checkout" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Order details" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Contact" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Delivery" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Payment" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Discount" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email address")).toHaveValue(
      "maya.chen@example.com",
    );
    expect(screen.getByLabelText("Coupon code")).toHaveValue("WELCOME10");
    expect(screen.getByText("Appears as you type")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Card number"), "4242424242424242");

    expect(screen.getByLabelText("Card number")).toHaveValue(
      "4242 4242 4242 4242",
    );
    expect(screen.getByText("Visa detected")).toBeInTheDocument();
  });

  it("opens human-focused activity in a drawer and closes it with Escape", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openCheckout(user);

    const trigger = screen.getByRole("button", { name: /^activity/i });
    await user.click(trigger);

    expect(screen.getByRole("dialog", { name: "Activity" })).toBeInTheDocument();
    expect(screen.getByText("What changed")).toBeInTheDocument();
    expect(screen.getByText("Restore points")).toBeInTheDocument();
    expect(screen.getByText("Auto-saved")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Save checkpoint" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/safety checks/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close activity" })).toHaveFocus();

    await user.keyboard("{Escape}");

    expect(
      screen.queryByRole("dialog", { name: "Activity" }),
    ).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("separates human and agent changes", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openCheckout(user);

    await user.selectOptions(screen.getByLabelText("Shipping method"), "pickup");
    await user.click(
      screen.getByRole("button", { name: "Preview agent update" }),
    );

    expect(screen.getByText("You updated")).toBeInTheDocument();
    expect(
      await screen.findByDisplayValue("44 River Road, Portland, OR 97209"),
    ).toBeInTheDocument();
    expect(screen.getByText("Agent updated")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^activity/i }));
    expect(screen.getByText("Delivery method changed")).toBeInTheDocument();
    expect(screen.getByText("Shipping address is changing")).toBeInTheDocument();
  });

  it("auto-saves and restores checkout form details from a checkpoint", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openCheckout(user);

    const coupon = screen.getByLabelText("Coupon code");
    await user.clear(coupon);
    await user.type(coupon, "SHIPFREE");
    expect(screen.getByText("Auto-saving…")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Save change" }),
    ).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^activity/i })).toHaveTextContent(
        "1",
      ),
    );
    expect(coupon).toHaveValue("SHIPFREE");

    await user.click(screen.getByRole("button", { name: /^activity/i }));
    expect(screen.getByText("Automatic checkpoint 1")).toBeInTheDocument();
    expect(
      screen.getByText("Before you changed the discount code."),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Restore" }));

    expect(screen.getByLabelText("Coupon code")).toHaveValue("WELCOME10");
    expect(screen.getByRole("button", { name: "Restored" })).toBeInTheDocument();
    expect(screen.getAllByText("2 changes")).toHaveLength(2);
    expect(screen.getAllByText("Discount code changed")).toHaveLength(2);
  });

  it("shows an order-complete dialog and starts a fresh checkout", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openCheckout(user);

    await user.type(screen.getByLabelText("Card number"), "4242424242424242");
    await user.click(screen.getByRole("button", { name: "Pay $148.00" }));

    expect(
      screen.getByRole("dialog", { name: "Order complete" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/demo checkout/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start again" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Start again" }));

    expect(
      screen.queryByRole("dialog", { name: "Order complete" }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Card number")).toHaveValue("");
    expect(screen.getByLabelText("Coupon code")).toHaveValue("WELCOME10");
    expect(screen.getByRole("button", { name: "Pay $148.00" })).toBeInTheDocument();
  });

  it("applies a surprise coupon discount and updates the total", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const user = userEvent.setup();
    render(<App />);
    await openCheckout(user);

    expect(screen.getByRole("button", { name: "Pay $148.00" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(screen.getByRole("status")).toHaveTextContent("15% off applied");
    expect(screen.getByText("Discount (WELCOME10)")).toBeInTheDocument();
    expect(screen.getByText("−$22.20")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pay $125.80" })).toBeInTheDocument();
  });
});
