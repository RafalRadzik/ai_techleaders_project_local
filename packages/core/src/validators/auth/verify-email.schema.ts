import { z } from 'zod';
import { registerSchema } from './register.schema';

/** The inbox owner chooses the credential; registration's password is only a claim marker. */
export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Open the link in your confirmation email.'),
  password: registerSchema.shape.password,
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
