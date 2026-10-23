import type { z } from 'zod';
import { BadRequestError, type FieldErrors, ValidationError } from './errors';

function flattenZodError(error: z.ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join('.') : '_root';
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}

/** The request's JSON body; a body that is not JSON is a `400`, never a 500. */
export async function readJsonBody(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new BadRequestError('Request body must be valid JSON');
  }
}

/** Parse `data` with `schema`, or throw a `422 validation_failed` keyed by dotted path. */
export function validateWith<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError('Validation failed', flattenZodError(result.error));
  }
  return result.data;
}

/**
 * Read and validate a JSON request body with the same schema the client's `CrudForm`
 * uses. For workflow routes built on `apiHandler` directly; `makeCrudRoute` uses the same
 * two steps, so both answer a bad body identically.
 */
export async function parseJsonBody<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  return validateWith(schema, await readJsonBody(req));
}
