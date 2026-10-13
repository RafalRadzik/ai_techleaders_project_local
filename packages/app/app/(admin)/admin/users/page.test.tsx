import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AdminUsersPage, { metadata } from "./page";

vi.mock("./users-panel", () => ({ UsersPanel: () => <div data-testid="users-panel" /> }));

describe("AdminUsersPage", () => {
  it("renders the header, a link back to the dashboard and the users panel", () => {
    render(<AdminUsersPage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Users");
    expect(screen.getByRole("link", { name: "← Dashboard" })).toHaveAttribute("href", "/admin");
    expect(screen.getByTestId("users-panel")).toBeInTheDocument();
    expect(metadata).toEqual({ title: "Users" });
  });
});
