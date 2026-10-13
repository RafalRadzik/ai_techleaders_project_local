import type { HealthIndicator } from "@devmentor/core";
import type { EntityManager } from "@mikro-orm/postgresql";

interface Deps {
  em: EntityManager;
}

export class DatabaseHealthIndicator implements HealthIndicator {
  readonly name = "database";
  private readonly em: EntityManager;

  constructor({ em }: Deps) {
    this.em = em;
  }

  async ping(): Promise<void> {
    await this.em.execute("select 1");
  }
}
