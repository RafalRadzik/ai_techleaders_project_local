import "server-only";

import { HealthService, UserService, type HealthIndicator, type UserRepository } from "@devmentor/core";
import {
  DatabaseHealthIndicator,
  getOrm,
  MikroOrmUserRepository,
  type EntityManager,
  type MikroORM,
} from "@devmentor/db";
import { createConsoleLogger, type Logger } from "@devmentor/shared";
import { asClass, asFunction, createContainer, InjectionMode, type AwilixContainer } from "awilix";
import { cache } from "react";

/** Everything resolvable from the container. Add new registrations here first. */
export interface Cradle {
  logger: Logger;
  orm: MikroORM;
  em: EntityManager;
  userRepository: UserRepository;
  databaseHealthIndicator: HealthIndicator;
  healthIndicators: HealthIndicator[];
  healthService: HealthService;
  userService: UserService;
}

export type AppContainer = AwilixContainer<Cradle>;

function createRootContainer(): AppContainer {
  const container = createContainer<Cradle>({
    injectionMode: InjectionMode.PROXY,
    strict: true,
  });

  container.register({
    // Singletons: process-wide, stateless or owning long-lived resources (the connection pool).
    logger: asFunction(() => createConsoleLogger()).singleton(),
    orm: asFunction(getOrm).singleton(),

    // Scoped: one instance per request scope. `em` is forked so identity maps never leak between requests.
    em: asFunction(({ orm }: Cradle) => orm.em.fork()).scoped(),
    userRepository: asClass(MikroOrmUserRepository).scoped(),
    databaseHealthIndicator: asClass(DatabaseHealthIndicator).scoped(),
    healthIndicators: asFunction(({ databaseHealthIndicator }: Cradle) => [databaseHealthIndicator]).scoped(),
    healthService: asClass(HealthService).scoped(),
    userService: asClass(UserService).scoped(),
  });

  return container;
}

let rootContainer: AppContainer | undefined;

function getRootContainer(): AppContainer {
  rootContainer ??= createRootContainer();
  return rootContainer;
}

/**
 * Request-scoped DI container. Memoised per server request with React `cache`, so every
 * Server Component in one render shares the same scope (and the same forked EntityManager).
 * In Route Handlers and Server Actions call it once and pass the scope (or resolved services) along.
 */
export const getRequestContainer = cache((): AppContainer => getRootContainer().createScope());
