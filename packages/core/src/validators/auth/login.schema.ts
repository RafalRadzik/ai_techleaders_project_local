import { z } from 'zod';
import { emailField, PASSWORD_TOO_LONG_MESSAGE, passwordByteCap, returnToField } from './register.schema';

/**
 * Shared validation for `POST /api/auth/login`. No minimum beyond non-empty: the length
 * rule belongs to registration, and a failed sign-in stays a generic 401. The byte cap
 * still applies so an unbounded string never reaches the hashing gate.
 */
export const loginSchema = z.object({
  email: emailField,
  password: z
    .string()
    .min(1, 'Enter your password.')
    .refine(passwordByteCap, PASSWORD_TOO_LONG_MESSAGE),
  returnTo: returnToField,
});

export type LoginInput = z.infer<typeof loginSchema>;
