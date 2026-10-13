import { z } from "zod";

// Column lengths of the `users` table.
const EMAIL_MAX_LENGTH = 320;
const NAME_MAX_LENGTH = 200;

export const userCreateSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Enter a valid email address").max(EMAIL_MAX_LENGTH, "Email is too long")),
  name: z.string().trim().min(1, "Name is required").max(NAME_MAX_LENGTH, "Name is too long"),
});

export type UserCreateInput = z.output<typeof userCreateSchema>;
