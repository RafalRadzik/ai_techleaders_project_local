import { describe, expect, it } from "vitest";
import { assertNever } from "./assert";

describe("assertNever", () => {
  it("throws with the default message and the serialised value", () => {
    expect(() => assertNever("x" as never)).toThrow('Unexpected value: "x"');
  });

  it("uses a custom message", () => {
    expect(() => assertNever({ a: 1 } as never, "Unknown kind")).toThrow('Unknown kind: {"a":1}');
  });
});
