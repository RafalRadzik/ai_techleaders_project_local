import { describe, expect, it } from "vitest";
import * as shared from "./index";

describe("@devmentor/shared entry point", () => {
  it("exposes the public API", () => {
    expect(Object.keys(shared).sort()).toEqual(
      [
        "API_CLIENT_HEADER",
        "API_CLIENT_HEADER_VALUE",
        "AppError",
        "ConflictError",
        "DEFAULT_REDACTED_KEYS",
        "ForbiddenError",
        "NotFoundError",
        "UnauthorizedError",
        "ValidationError",
        "assertNever",
        "createConsoleLogger",
        "integerEnv",
        "requiredEnv",
      ].sort(),
    );
    expect(shared.API_CLIENT_HEADER).toBe("x-devmentor-client");
    expect(shared.API_CLIENT_HEADER_VALUE).toBe("1");
  });
});
