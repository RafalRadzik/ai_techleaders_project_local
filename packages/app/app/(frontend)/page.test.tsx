import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "./page";

describe("HomePage", () => {
  it("renders the hero and links to the admin area", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Grow as a developer");
    expect(screen.getByRole("link", { name: "Open admin" })).toHaveAttribute("href", "/admin");
  });
});
