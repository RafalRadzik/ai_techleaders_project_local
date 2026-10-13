import "server-only";

import { ValidationError, type FieldErrors } from "@devmentor/shared";
import { z } from "zod";

/**
 * Parses the JSON body with a shared schema. Only the schema's typed output reaches services,
 * so unknown fields (e.g. `id`, `status`) are dropped (no mass assignment).
 */
export async function parseBody<TSchema extends z.ZodType>(request: Request, schema: TSchema): Promise<z.output<TSchema>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    throw new ValidationError("Request body must be valid JSON", {}, { cause: error });
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    const { formErrors, fieldErrors } = z.flattenError(result.error);
    throw new ValidationError(formErrors.join(" ") || "Some fields are invalid", toFieldErrors(fieldErrors));
  }
  return result.data;
}

function toFieldErrors(errors: Partial<Record<string, string[]>>): FieldErrors {
  return Object.fromEntries(
    Object.entries(errors).filter((entry): entry is [string, string[]] => entry[1] !== undefined),
  );
}
