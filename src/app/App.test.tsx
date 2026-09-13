import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useStateTraceStore } from "../store/useStateTraceStore";
import { App } from "./App";

async function openCheckout(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole("button", { name: "Open checkout demo" }),
  );
}

describe("App", () => {
  beforeEach(() => {
    useStateTraceStore.getState().reset();
  });

  afterEach(() => {
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
    expect(screen.getByText("Visa ending in 4242")).toBeInTheDocument();
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

  it("saves and restores checkout form details from a checkpoint", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openCheckout(user);

    const coupon = screen.getByLabelText("Coupon code");
    await user.clear(coupon);
    await user.type(coupon, "SHIPFREE");
    await user.click(screen.getByRole("button", { name: "Save change" }));
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
});
