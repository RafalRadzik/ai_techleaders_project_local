import type { UserRepository } from "./user";

interface UserServiceDeps {
  userRepository: UserRepository;
}

export class UserService {
  private readonly users: UserRepository;

  constructor({ userRepository }: UserServiceDeps) {
    this.users = userRepository;
  }

  countUsers(): Promise<number> {
    return this.users.count();
  }
}
