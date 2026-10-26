import type { AppEnv } from '../../../config/env';
import { ServiceUnavailableError } from '../../../http/errors';
import { fetchJson, type OutboundLogger } from '../../../http/outbound';
import type { Mailer, MailMessage } from '../mailer.port';

export const RESEND_EMAILS_URL = 'https://api.resend.com/emails';

/**
 * Production delivery over Resend's HTTP API (B14): one `fetchJson` call, no SMTP client.
 * `fetchJson` bounds the wait and turns a timeout, network failure or non-2xx answer into
 * `ServiceUnavailableError`; its failure log carries neither headers (the bearer key) nor
 * the body (the message). Missing `MAIL_API_KEY`/`MAIL_FROM` fails closed per call — in
 * production `createContainer` refuses to start without them, so this only bites
 * development and test.
 */
export class ResendMailer implements Mailer {
  private readonly env: AppEnv;
  private readonly logger: OutboundLogger;

  constructor({ env, logger }: { env: AppEnv; logger: OutboundLogger }) {
    this.env = env;
    this.logger = logger;
  }

  async send({ to, subject, text }: MailMessage): Promise<void> {
    const { MAIL_API_KEY: apiKey, MAIL_FROM: from } = this.env;
    if (!apiKey || !from) {
      throw new ServiceUnavailableError(undefined, {
        cause: { reason: 'not_configured', missing: apiKey ? 'MAIL_FROM' : 'MAIL_API_KEY' },
      });
    }
    await fetchJson<unknown>(RESEND_EMAILS_URL, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ from, to: [to], subject, text }),
      logger: this.logger,
    });
  }
}
