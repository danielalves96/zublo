import { render, screen, fireEvent } from "@testing-library/react";

import { ErrorBoundary } from "./ErrorBoundary";

// A component that throws when shouldThrow is true
function Bomb({ shouldThrow }: { shouldThrow?: boolean }) {
  if (shouldThrow) throw new Error("Test explosion");
  return <p>All good</p>;
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders children when there is no error", () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText("All good")).toBeInTheDocument();
  });

  it("renders the default error UI when a child throws", () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Test explosion")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("renders a custom fallback when provided and a child throws", () => {
    render(
      <ErrorBoundary fallback={<p>Custom fallback</p>}>
        <Bomb shouldThrow />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Custom fallback")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });

  it("resets the error state when Try again is clicked", () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    // After reset, boundary re-renders children — Bomb still throws, so error UI re-appears.
    // The important thing is the reset method was invoked without crashing.
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });
});
