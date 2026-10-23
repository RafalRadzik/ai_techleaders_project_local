import {
  asClass,
  asFunction,
  asValue,
  createContainer,
  InjectionMode,
  type AwilixContainer,
} from 'awilix';
import { getOrm } from '@devmentor/db';
import { getEnv, type AppEnv } from '../config/env';
import { bindSessionScope, loadSession } from '../http/auth';
import { createLogger } from '../logger';
import { EventBus } from '../events/event-bus';
import { GithubIdentityAdapter } from '../services/auth/adapters/github-identity';
import { MockGithubIdentityAdapter } from '../services/auth/adapters/mock-github-identity';
import type { GithubIdentityPort } from '../services/auth/github-identity.port';
import { readSessionCookie, SessionService } from '../services/auth/session.service';
import { TokenService } from '../services/auth/token.service';
import { UserService } from '../services/auth/user.service';
import { systemClock } from '../time/clock';
import type { Cradle } from './cradle';

/**
 * The root container is cached on `globalThis` so Next.js HMR reuses a single
 * container (and the single ORM/pool it holds) across dev reloads. Registrations are
 * explicit — no `loadModules` globbing — so every binding is greppable.
 */
const globalForContainer = globalThis as unknown as {
  __devmentorContainer?: Promise<AwilixContainer<Cradle>>;
};

/**
 * Secrets production cannot run without. Checked here rather than in the zod schema
 * because `getEnv()` also runs during `next build`, which is production-shaped with no
 * secrets; the container is only ever created at request time.
 */
function assertProductionConfig(env: AppEnv): void {
  if (env.NODE_ENV === 'production' && !env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET must be set when NODE_ENV=production');
  }
}

/**
 * The real GitHub adapter unless both fake signals are present (B14). The env schema
 * already refuses `AUTH_IDENTITY_ADAPTER=mock` without `INTEGRATION_TEST_RUN=1`; the
 * second check here keeps the selection safe even for a hand-built `AppEnv`.
 */
export function createIdentityAdapter(cradle: Cradle): GithubIdentityPort {
  const { env } = cradle;
  if (env.AUTH_IDENTITY_ADAPTER === 'mock' && env.INTEGRATION_TEST_RUN) {
    return new MockGithubIdentityAdapter(cradle);
  }
  return new GithubIdentityAdapter(cradle);
}

async function build(): Promise<AwilixContainer<Cradle>> {
  const env = getEnv();
  assertProductionConfig(env);

  // Resolve the ORM once up front so it can be registered as a shared singleton value.
  const orm = await getOrm();

  const container = createContainer<Cradle>({
    injectionMode: InjectionMode.PROXY,
    strict: true,
  });

  container.register({
    env: asValue(env),
    logger: asFunction(createLogger).singleton(),
    orm: asValue(orm),
    clock: asValue(systemClock),
    eventBus: asClass(EventBus).singleton(),
    sessionService: asClass(SessionService).singleton(),
    tokenService: asClass(TokenService).singleton(),
    identity: asFunction(createIdentityAdapter).singleton(),
    // A forked EntityManager per scope gives each request its own identity map / UoW.
    em: asFunction(({ orm }: Cradle) => orm.em.fork()).scoped(),
    userService: asClass(UserService).scoped(),
    // No request, no session: plain `withScope` work always sees `null`.
    // `withRequestScope` overrides this key in its own scope.
    session: asFunction(() => Promise.resolve(null)).scoped(),
  });

  // Default in-process subscribers. Concept side effects (send a message, invalidate
  // a cache) register here; for now we just log so the event path is observable.
  container.cradle.eventBus.on('auth.user.created', ({ userId }) => {
    container.cradle.logger.info({ userId }, 'auth.user.created');
  });

  return container;
}

export function getContainer(): Promise<AwilixContainer<Cradle>> {
  if (!globalForContainer.__devmentorContainer) {
    globalForContainer.__devmentorContainer = build();
  }
  return globalForContainer.__devmentorContainer;
}

/**
 * Run `fn` inside a fresh awilix scope. The scope owns a forked EntityManager and any
 * other SCOPED services; it is disposed (releasing scoped state) when `fn` settles.
 * This is the entry point request handlers should use to touch the domain.
 */
export async function withScope<T>(fn: (cradle: Cradle) => Promise<T> | T): Promise<T> {
  const container = await getContainer();
  const scope = container.createScope<Cradle>();
  try {
    return await fn(scope.cradle);
  } finally {
    await scope.dispose();
  }
}

/**
 * `withScope` for work done on behalf of a session cookie value — the page helper's
 * entry point, which has a cookie from `cookies()` but no `Request`. The scope's
 * `session` key resolves lazily, at most once, to the live `Session` or `null`; it
 * trusts nothing in the token beyond what `loadSession` re-checks against the database.
 */
export async function withSessionCookieScope<T>(
  cookieValue: string | null | undefined,
  fn: (cradle: Cradle) => Promise<T> | T,
): Promise<T> {
  const value = cookieValue || null;
  const container = await getContainer();
  const scope = container.createScope<Cradle>();
  scope.register({
    session: asFunction((cradle: Cradle) => loadSession(value, cradle)).scoped(),
  });
  bindSessionScope(scope.cradle, value);
  try {
    return await fn(scope.cradle);
  } finally {
    await scope.dispose();
  }
}

/**
 * Run `fn` in a request scope: everything `withScope` gives, plus a `session` key bound
 * to this request's `devmentor_session` cookie. Resolving `session` never throws a 401 —
 * a public route gets `null` and failing closed stays the caller's decision
 * (`requireSession`).
 */
export function withRequestScope<T>(
  req: Request,
  fn: (cradle: Cradle) => Promise<T> | T,
): Promise<T> {
  return withSessionCookieScope(readSessionCookie(req.headers.get('cookie')), fn);
}
