import { describe, expect, it } from "vitest";
import { AppError, ConflictError, ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from "./errors";

describe("AppError", () => {
  it("keeps the code, message and cause", () => {
    const cause = new Error("root");
    const error = new AppError("custom_code", "Custom message", { cause });

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("AppError");
    expect(error.code).toBe("custom_code");
    expect(error.message).toBe("Custom message");
    expect(error.cause).toBe(cause);
  });
});

describe.each([
  { ErrorClass: NotFoundError, name: "NotFoundError", code: "not_found", message: "Not found" },
  { ErrorClass: UnauthorizedError, name: "UnauthorizedError", code: "unauthorized", message: "Authentication required" },
  { ErrorClass: ForbiddenError, name: "ForbiddenError", code: "forbidden", message: "Forbidden" },
  { ErrorClass: ConflictError, name: "ConflictError", code: "conflict", message: "Conflict" },
])("$name", ({ ErrorClass, name, code, message }) => {
  it("has a default message", () => {
    const error = new ErrorClass();

    expect(error).toBeInstanceOf(AppError);
    expect(error.name).toBe(name);
    expect(error.code).toBe(code);
    expect(error.message).toBe(message);
  });

  it("accepts a custom message and cause", () => {
    const cause = new Error("root");
    const error = new ErrorClass("Custom", { cause });

    expect(error.message).toBe("Custom");
    expect(error.cause).toBe(cause);
  });
});

describe("ValidationError", () => {
  it("has defaults", () => {
    const error = new ValidationError();

    expect(error).toBeInstanceOf(AppError);
    expect(error.name).toBe("ValidationError");
    expect(error.code).toBe("validation_failed");
    expect(error.message).toBe("Validation failed");
    expect(error.fieldErrors).toEqual({});
  });

  it("keeps field errors and cause", () => {
    const cause = new Error("root");
    const error = new ValidationError("Bad input", { email: ["Invalid"] }, { cause });

    expect(error.message).toBe("Bad input");
    expect(error.fieldErrors).toEqual({ email: ["Invalid"] });
    expect(error.cause).toBe(cause);
  });
});
