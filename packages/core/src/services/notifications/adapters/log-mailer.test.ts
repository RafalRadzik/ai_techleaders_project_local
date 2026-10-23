import { describe, expect, it, vi } from 'vitest';
import { LogMailer } from './log-mailer';

describe('LogMailer', () => {
  it('writes one structured mail.sent line per message and sends nothing', async () => {
    const logger = { info: vi.fn() };
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const message = { to: 'ada@devmentor.test', subject: 'Verify', text: 'https://x/verify?t=1' };

    await new LogMailer({ logger }).send(message);

    expect(logger.info).toHaveBeenCalledExactlyOnceWith(message, 'mail.sent');
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
