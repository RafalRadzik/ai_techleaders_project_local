import { Writable } from 'node:stream';
import { pino } from 'pino';
import { describe, expect, it } from 'vitest';
import { parseAppEnv } from './config/env';
import { createLogger, loggerOptions } from './logger';

function capture(): { lines: () => Record<string, unknown>[]; stream: Writable } {
  const chunks: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(String(chunk));
      callback();
    },
  });
  return {
    stream,
    lines: () =>
      chunks
        .join('')
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as Record<string, unknown>),
  };
}

describe('logger', () => {
  it('creates a pino logger at the configured level', () => {
    const logger = createLogger();
    expect(logger.level).toBe(parseAppEnv(process.env).LOG_LEVEL);
  });

  it('redacts secrets at the top level, one level deep and in header bags', () => {
    const { stream, lines } = capture();
    const logger = pino(loggerOptions(parseAppEnv({ LOG_LEVEL: 'info' })), stream);

    logger.info(
      {
        password: 'p@ss',
        passwordHash: 'scrypt$hash',
        token: 'tok',
        authorization: 'Bearer re_top',
        cookie: 'devmentor_session=abc',
        user: { password: 'nested', accessToken: 'gho_x', apiKey: 're_key' },
        req: { headers: { authorization: 'Bearer re_hdr', cookie: 'a=b', 'set-cookie': 'c=d' } },
      },
      'secrets',
    );

    const [line] = lines();
    const serialized = JSON.stringify(line);
    for (const secret of ['p@ss', 'scrypt$hash', 'tok"', 're_top', 'abc', 'nested', 'gho_x', 're_key', 're_hdr', 'a=b', 'c=d']) {
      expect(serialized).not.toContain(secret);
    }
    expect(line).toMatchObject({ app: 'DevMentor', password: '[Redacted]', msg: 'secrets' });
  });

  it('keeps the log mailer fields readable for the harness', () => {
    const { stream, lines } = capture();
    const logger = pino(loggerOptions(parseAppEnv({})), stream);
    logger.info({ to: 'a@devmentor.test', subject: 'Verify', text: 'https://x/verify?token=t' }, 'mail.sent');
    expect(lines()[0]).toMatchObject({
      to: 'a@devmentor.test',
      subject: 'Verify',
      text: 'https://x/verify?token=t',
    });
  });
});
