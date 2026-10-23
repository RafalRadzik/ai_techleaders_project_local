import { beforeEach, describe, expect, it, vi } from 'vitest';
import { systemClock } from '../time/clock';

const fork = vi.fn(() => ({ forked: true }));
const orm = { em: { fork } };
const logger = { info: vi.fn(), error: vi.fn() };

// Stub the ORM leaf so the test never imports @mikro-orm/* or opens a connection.
vi.mock('@devmentor/db', () => ({ getOrm: vi.fn(async () => orm), User: class {} }));
vi.mock('../logger', () => ({ createLogger: () => logger }));

const { getContainer, withScope } = await import('./container');

const globalForContainer = globalThis as { __devmentorContainer?: unknown };

beforeEach(() => {
  delete globalForContainer.__devmentorContainer;
  fork.mockClear();
  logger.info.mockClear();
});

describe('getContainer', () => {
  it('builds once and caches the container on globalThis', async () => {
    const first = getContainer();
    expect(getContainer()).toBe(first);
    expect(globalForContainer.__devmentorContainer).toBe(first);
  });

  it('registers the system clock as the clock singleton', async () => {
    const container = await getContainer();
    expect(container.cradle.clock).toBe(systemClock);
    expect(container.createScope().cradle.clock).toBe(systemClock);
  });

  it('registers env, logger, orm and the event bus', async () => {
    const { cradle } = await getContainer();
    expect(cradle.env.APP_NAME).toEqual(expect.any(String));
    expect(cradle.logger).toBe(logger);
    expect(cradle.orm).toBe(orm);
    expect(cradle.eventBus).toBeDefined();
    expect(cradle.eventBus).toBe(cradle.eventBus);
  });

  it('logs auth.user.created through the default subscriber', async () => {
    const { cradle } = await getContainer();
    await cradle.eventBus.emit('auth.user.created', { userId: 'u1', email: 'u1@example.com' });
    expect(logger.info).toHaveBeenCalledWith({ userId: 'u1' }, 'auth.user.created');
  });
});

describe('withScope', () => {
  it('gives each scope its own forked EntityManager and scoped services', async () => {
    const a = await withScope((cradle) => ({ em: cradle.em, users: cradle.userService }));
    const b = await withScope((cradle) => ({ em: cradle.em, users: cradle.userService }));
    expect(fork).toHaveBeenCalledTimes(2);
    expect(a.em).toEqual({ forked: true });
    expect(a.users).not.toBe(b.users);
  });

  it('disposes the scope and rethrows when fn fails', async () => {
    const container = await getContainer();
    const scope = container.createScope();
    const dispose = vi.spyOn(scope, 'dispose');
    vi.spyOn(container, 'createScope').mockReturnValueOnce(scope);

    await expect(
      withScope(() => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
