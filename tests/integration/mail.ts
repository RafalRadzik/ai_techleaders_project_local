import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { integrationArtifactsDirectory } from './agent-browser';

/** `global-setup.ts` pipes the app's stdout and stderr here. */
export const appLogPath = resolve(integrationArtifactsDirectory, 'app.log');

/** The `msg` of the line the log mailer writes (`log-mailer.ts`). */
const MAIL_SENT = 'mail.sent';

export type CapturedMail = { to: string; subject: string; text: string };

export type WaitForMailOptions = {
  /** Give up after this long. Default 10 s. */
  timeoutMs?: number;
  /** Re-read the log this often. Default 100 ms. */
  pollMs?: number;
  /** Ignore everything before this byte offset — take it with `appLogOffset()`. */
  since?: number;
  logPath?: string;
};

function asMail(line: string): CapturedMail | undefined {
  let entry: unknown;
  try {
    entry = JSON.parse(line);
  } catch {
    return undefined; // Next.js banners and other plain-text output.
  }
  if (typeof entry !== 'object' || entry === null) return undefined;
  const { msg, to, subject, text } = entry as Record<string, unknown>;
  if (msg !== MAIL_SENT) return undefined;
  if (typeof to !== 'string' || typeof subject !== 'string' || typeof text !== 'string') {
    return undefined;
  }
  return { to, subject, text };
}

/**
 * Every captured message to `to` (case-insensitive) in `log`, oldest first. Only
 * newline-terminated lines count, so a line still being written is never half-parsed.
 */
export function parseMailLog(log: string, to: string): CapturedMail[] {
  const complete = log.slice(0, log.lastIndexOf('\n') + 1);
  const recipient = to.toLowerCase();
  return complete
    .split('\n')
    .map(asMail)
    .filter((mail): mail is CapturedMail => mail?.to.toLowerCase() === recipient);
}

async function readLogFrom(path: string, since: number): Promise<string> {
  try {
    return (await readFile(path)).subarray(since).toString('utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return '';
    throw error;
  }
}

/** The current size of the app log; pass it as `since` to ignore earlier mail. */
export async function appLogOffset(logPath = appLogPath): Promise<number> {
  return Buffer.byteLength(await readLogFrom(logPath, 0));
}

/**
 * Poll the app log until the log mailer has written a message to `to`, and return the
 * first one after `since`. Rejects with a descriptive error once `timeoutMs` passes.
 */
export async function waitForMail(
  to: string,
  { timeoutMs = 10_000, pollMs = 100, since = 0, logPath = appLogPath }: WaitForMailOptions = {},
): Promise<CapturedMail> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const [mail] = parseMailLog(await readLogFrom(logPath, since), to);
    if (mail) return mail;
    if (Date.now() >= deadline) {
      throw new Error(`No mail to ${to} appeared in ${logPath} within ${timeoutMs} ms`);
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, pollMs));
  }
}
