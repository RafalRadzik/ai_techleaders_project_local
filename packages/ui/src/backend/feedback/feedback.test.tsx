import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EmptyState } from "./EmptyState";
import { ErrorMessage } from "./ErrorMessage";
import { LoadingMessage } from "./LoadingMessage";

describe("EmptyState", () => {
  it("renders the title only", () => {
    const { container } = render(<EmptyState title="No users yet" />);

    expect(screen.getByText("No users yet")).toBeInTheDocument();
    expect(container.querySelectorAll("p")).toHaveLength(1);
  });

  it("renders a description, an action and extra classes", () => {
    const { container } = render(
      <EmptyState title="Empty" description="Add one" action={<button type="button">Add</button>} className="extra" />,
    );

    expect(screen.getByText("Add one")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
    expect(container.firstChild).toHaveClass("extra");
  });
});

describe("ErrorMessage", () => {
  it("renders an alert with the default title and no retry button", () => {
    render(<ErrorMessage message="Server unavailable" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
    expect(screen.getByText("Server unavailable")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders a custom title and calls onRetry", async () => {
    const onRetry = vi.fn();
    render(<ErrorMessage title="Load failed" message="Timeout" onRetry={onRetry} className="extra" />);

    expect(screen.getByRole("alert")).toHaveClass("extra");
    expect(screen.getByText("Load failed")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});

describe("LoadingMessage", () => {
  it("renders a polite status with the default label", () => {
    render(<LoadingMessage />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });

  it("renders a custom label and class", () => {
    render(<LoadingMessage label="Fetching users" className="extra" />);

    expect(screen.getByRole("status")).toHaveTextContent("Fetching users");
    expect(screen.getByRole("status")).toHaveClass("extra");
  });
});
