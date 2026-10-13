import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("joins truthy class names", () => {
    expect(cn("a", false, "b")).toContain("a");
    expect(cn("a", false, "b")).toContain("b");
  });
});
