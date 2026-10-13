import { describe, expect, it } from "vitest";
import { z } from "zod";
import { userCreateSchema } from "./user-create.schema";

function fieldErrors(input: unknown) {
  const result = userCreateSchema.safeParse(input);
  return result.success ? {} : z.flattenError(result.error).fieldErrors;
}

describe("userCreateSchema", () => {
  it("trims and lower-cases the email and trims the name", () => {
    expect(userCreateSchema.parse({ email: "  Ada@Example.COM ", name: "  Ada Lovelace " })).toEqual({
      email: "ada@example.com",
      name: "Ada Lovelace",
    });
  });

  it("drops unknown fields", () => {
    expect(userCreateSchema.parse({ email: "a@b.co", name: "A", id: "x", role: "admin" })).toEqual({
      email: "a@b.co",
      name: "A",
    });
  });

  it.each([
    { label: "an invalid email", input: { email: "nope", name: "A" }, errors: { email: ["Enter a valid email address"] } },
    {
      label: "a too long email",
      input: { email: `${"a".repeat(310)}@example.com`, name: "A" },
      errors: { email: ["Email is too long"] },
    },
    { label: "a blank name", input: { email: "a@b.co", name: "   " }, errors: { name: ["Name is required"] } },
    { label: "a too long name", input: { email: "a@b.co", name: "a".repeat(201) }, errors: { name: ["Name is too long"] } },
  ])("rejects $label", ({ input, errors }) => {
    expect(fieldErrors(input)).toEqual(errors);
  });

  it("accepts the maximum lengths", () => {
    const email = `${"a".repeat(308)}@example.com`;
    expect(email).toHaveLength(320);
    expect(userCreateSchema.safeParse({ email, name: "a".repeat(200) }).success).toBe(true);
  });
});
