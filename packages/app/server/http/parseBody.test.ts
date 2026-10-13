// @vitest-environment node
import { ValidationError } from "@devmentor/shared";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseBody } from "./parseBody";
import { jsonRequest } from "./http.test-utils";

const schema = z.object({ name: z.string().min(1, "Name is required") });

async function parseError(promise: Promise<unknown>): Promise<ValidationError> {
  const error = await promise.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(ValidationError);
  return error as ValidationError;
}

describe("parseBody", () => {
  it("returns only the schema output", async () => {
    await expect(parseBody(jsonRequest("POST", { name: "Ada", role: "admin" }), schema)).resolves.toEqual({ name: "Ada" });
  });

  it("rejects invalid JSON", async () => {
    const error = await parseError(parseBody(jsonRequest("POST", "{not json"), schema));

    expect(error.message).toBe("Request body must be valid JSON");
    expect(error.fieldErrors).toEqual({});
    expect(error.cause).toBeInstanceOf(SyntaxError);
  });

  it("reports field errors", async () => {
    const error = await parseError(parseBody(jsonRequest("POST", { name: "" }), schema));

    expect(error.message).toBe("Some fields are invalid");
    expect(error.fieldErrors).toEqual({ name: ["Name is required"] });
  });

  it("reports form-level errors as the message", async () => {
    const error = await parseError(parseBody(jsonRequest("POST", ["not", "an", "object"]), schema));

    expect(error.message).toMatch(/expected object/i);
    expect(error.fieldErrors).toEqual({});
  });
});
