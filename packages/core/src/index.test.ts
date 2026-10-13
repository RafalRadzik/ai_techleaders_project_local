import { describe, expect, it } from "vitest";
import * as core from "./index";
import * as validators from "./validators";

describe("@devmentor/core entry points", () => {
  it("exposes services and validators", () => {
    expect(Object.keys(core).sort()).toEqual(["HealthService", "UserService", "userCreateSchema"]);
  });

  it("exposes only schemas from the client-safe validators entry", () => {
    expect(Object.keys(validators)).toEqual(["userCreateSchema"]);
    expect(validators.userCreateSchema).toBe(core.userCreateSchema);
  });
});
