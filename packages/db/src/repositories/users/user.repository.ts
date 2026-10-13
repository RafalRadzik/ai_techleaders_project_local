import type { NewUser, User, UserListOptions, UserRepository } from "@devmentor/core";
import { ConflictError } from "@devmentor/shared";
import { QueryOrder, UniqueConstraintViolationException } from "@mikro-orm/core";
import type { EntityManager } from "@mikro-orm/postgresql";
import { UserEntity } from "../../entities";

interface Deps {
  em: EntityManager;
}

export class MikroOrmUserRepository implements UserRepository {
  private readonly em: EntityManager;

  constructor({ em }: Deps) {
    this.em = em;
  }

  count(): Promise<number> {
    return this.em.count(UserEntity);
  }

  async findByEmail(email: string): Promise<User | null> {
    const entity = await this.em.findOne(UserEntity, { email });
    return entity ? toUser(entity) : null;
  }

  async list({ limit }: UserListOptions): Promise<User[]> {
    const entities = await this.em.find(UserEntity, {}, { orderBy: { createdAt: QueryOrder.DESC }, limit });
    return entities.map(toUser);
  }

  async create(user: NewUser): Promise<User> {
    const entity = this.em.create(UserEntity, { email: user.email, name: user.name });
    try {
      await this.em.flush();
    } catch (error) {
      if (error instanceof UniqueConstraintViolationException) {
        throw new ConflictError("A user with this email already exists", { cause: error });
      }
      throw error;
    }
    return toUser(entity);
  }
}

/** Plain domain object: keeps ORM internals out of service results and JSON responses. */
function toUser(entity: UserEntity): User {
  return {
    id: entity.id,
    email: entity.email,
    name: entity.name,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}
