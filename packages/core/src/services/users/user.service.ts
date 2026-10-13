import { ConflictError } from "@devmentor/shared";
import type { UserCreateInput } from "../../validators/users/user-create.schema";
import type { User } from "./user";
import type { UserRepository } from "./user-repository.port";

// Upper bound for the admin list until server-side pagination is needed.
const MAX_LISTED_USERS = 1000;

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

  list(): Promise<User[]> {
    return this.users.list({ limit: MAX_LISTED_USERS });
  }

  async create(input: UserCreateInput): Promise<User> {
    // Friendly early check; the unique constraint still guards against concurrent inserts.
    if (await this.users.findByEmail(input.email)) {
      throw new ConflictError("A user with this email already exists");
    }
    return this.users.create({ email: input.email, name: input.name });
  }
}
