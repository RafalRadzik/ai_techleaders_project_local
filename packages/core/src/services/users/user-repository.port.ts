import type { User } from "./user";

export interface NewUser {
  email: string;
  name: string;
}

export interface UserListOptions {
  limit: number;
}

/** Port implemented by @devmentor/db. */
export interface UserRepository {
  count(): Promise<number>;
  findByEmail(email: string): Promise<User | null>;
  /** Newest first. */
  list(options: UserListOptions): Promise<User[]>;
  /** Throws `ConflictError` when the email is already taken. */
  create(user: NewUser): Promise<User>;
}
