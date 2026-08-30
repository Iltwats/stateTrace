import { render, screen } from "@testing-library/react";
import { App } from "./App";

describe("App", () => {
  it("renders the StateTrace product shell", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "StateTrace" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/what actually committed/i),
    ).toBeInTheDocument();
  });
});

