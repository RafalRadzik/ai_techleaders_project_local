import type { User, UserRepository } from "@devmentor/core";
import type { EntityManager } from "@mikro-orm/postgresql";
import { UserEntity } from "../entities";

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

  findByEmail(email: string): Promise<User | null> {
    return this.em.findOne(UserEntity, { email });
  }
}
