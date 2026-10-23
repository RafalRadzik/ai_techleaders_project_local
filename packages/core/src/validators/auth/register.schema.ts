import { z } from 'zod';

/** scrypt input is capped in UTF-8 bytes, not characters: "ł" is one character but two bytes. */
export const PASSWORD_MAX_BYTES = 72;
export const PASSWORD_MIN_LENGTH = 12;
export const DISPLAY_NAME_MAX_LENGTH = 120;

const encoder = new TextEncoder();

export function utf8ByteLength(value: string): number {
  return encoder.encode(value).length;
}

export const PASSWORD_TOO_LONG_MESSAGE =
  `Use a password of at most ${PASSWORD_MAX_BYTES} bytes. Accented letters and emoji count as 2 to 4 bytes each.`;

/**
 * Trimmed and lowercased before the shape check, so " Ada@Example.COM " and
 * "ada@example.com" are one account. Idempotent: CrudForm submits the parsed value and
 * the route parses it again.
 */
export const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Enter your email address.')
  .email('Enter an email address in the form name@example.com.');

/** Passwords are never trimmed: every character the user typed is part of the secret. */
export const passwordByteCap = (value: string) => utf8ByteLength(value) <= PASSWORD_MAX_BYTES;

export const returnToField = z.string().optional();

/**
 * Shared validation for `POST /api/auth/register`. Imported by the route and by the
 * client `CrudForm` — one schema, two call sites. `returnTo` is re-validated by
 * `safeReturnTo` on the server.
 */
export const registerSchema = z.object({
  email: emailField,
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Use a password of at least ${PASSWORD_MIN_LENGTH} characters.`)
    .refine(passwordByteCap, PASSWORD_TOO_LONG_MESSAGE),
  displayName: z
    .string()
    .trim()
    .min(1, 'Enter the name other people will see.')
    .max(DISPLAY_NAME_MAX_LENGTH, `Keep your name to ${DISPLAY_NAME_MAX_LENGTH} characters or fewer.`),
  returnTo: returnToField,
});

export type RegisterInput = z.infer<typeof registerSchema>;
