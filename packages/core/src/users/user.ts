export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Port implemented by @devmentor/db. */
export interface UserRepository {
  count(): Promise<number>;
  findByEmail(email: string): Promise<User | null>;
}
