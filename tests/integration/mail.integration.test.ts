import { appendFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { integrationArtifactsDirectory } from './agent-browser';
import { appLogOffset, parseMailLog, waitForMail } from './mail';

const logPath = resolve(integrationArtifactsDirectory, 'mail-helper.log');

const mailLine = (to: string, text: string) =>
  `${JSON.stringify({ level: 30, app: 'DevMentor', to, subject: 'Verify your email', text, msg: 'mail.sent' })}\n`;

beforeEach(async () => {
  await mkdir(integrationArtifactsDirectory, { recursive: true });
  await writeFile(logPath, '');
});

afterEach(async () => {
  await rm(logPath, { force: true });
});

describe('parseMailLog', () => {
  it('returns only complete mail.sent lines for the recipient, ignoring other output', () => {
    const log = [
      '▲ Next.js 16 ready on http://127.0.0.1:3000\n',
      `${JSON.stringify({ level: 30, msg: 'auth.user.created', to: 'ada@devmentor.test' })}\n`,
      `${JSON.stringify({ msg: 'mail.sent', to: 'ada@devmentor.test', subject: 1, text: 'x' })}\n`,
      'null\n',
      mailLine('bob@devmentor.test', 'for bob'),
      mailLine('Ada@DevMentor.test', 'first'),
      mailLine('ada@devmentor.test', 'second'),
      mailLine('ada@devmentor.test', 'partial').trimEnd(),
    ].join('');

    expect(parseMailLog(log, 'ada@devmentor.test')).toEqual([
      { to: 'Ada@DevMentor.test', subject: 'Verify your email', text: 'first' },
      { to: 'ada@devmentor.test', subject: 'Verify your email', text: 'second' },
    ]);
  });
});

describe('waitForMail', () => {
  it('returns a message written after polling started', async () => {
    setTimeout(() => void appendFile(logPath, mailLine('ada@devmentor.test', 'https://x/verify?t=1')), 150);

    await expect(waitForMail('ada@devmentor.test', { logPath, pollMs: 20 })).resolves.toEqual({
      to: 'ada@devmentor.test',
      subject: 'Verify your email',
      text: 'https://x/verify?t=1',
    });
  });

  it('ignores mail before the `since` offset', async () => {
    await appendFile(logPath, mailLine('ada@devmentor.test', 'old'));
    const since = await appLogOffset(logPath);
    await appendFile(logPath, mailLine('ada@devmentor.test', 'new'));

    await expect(waitForMail('ada@devmentor.test', { logPath, since })).resolves.toMatchObject({
      text: 'new',
    });
  });

  it('times out cleanly with the recipient and log in the message', async () => {
    await appendFile(logPath, mailLine('bob@devmentor.test', 'not for ada'));
    const started = Date.now();

    await expect(
      waitForMail('ada@devmentor.test', { logPath, timeoutMs: 200, pollMs: 20 }),
    ).rejects.toThrow(`No mail to ada@devmentor.test appeared in ${logPath} within 200 ms`);
    expect(Date.now() - started).toBeLessThan(2_000);
  });

  it('treats a log that does not exist yet as empty', async () => {
    const missing = resolve(integrationArtifactsDirectory, 'missing-mail.log');
    expect(await appLogOffset(missing)).toBe(0);
    await expect(waitForMail('ada@devmentor.test', { logPath: missing, timeoutMs: 50 })).rejects.toThrow(
      'No mail to ada@devmentor.test',
    );
  });
});
