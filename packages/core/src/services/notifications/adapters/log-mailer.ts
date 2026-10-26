import type { Mailer, MailMessage } from '../mailer.port';

/** The log line the integration harness's `waitForMail` looks for. */
export const MAIL_SENT_LOG_MESSAGE = 'mail.sent';

export type MailLogger = {
  info(details: Record<string, unknown>, message: string): void;
};

/**
 * The development and integration-harness mailer (B14): nothing leaves the process; each
 * message becomes one structured log line. It deliberately logs `text` — in the harness
 * that is how `waitForMail` reads a verification link — which is acceptable only because
 * this adapter is never selected in production: `MAILER_ADAPTER=log` requires
 * `INTEGRATION_TEST_RUN=1`, and the unset fallback applies to `NODE_ENV=development` only.
 */
export class LogMailer implements Mailer {
  private readonly logger: MailLogger;

  constructor({ logger }: { logger: MailLogger }) {
    this.logger = logger;
  }

  async send({ to, subject, text }: MailMessage): Promise<void> {
    this.logger.info({ to, subject, text }, MAIL_SENT_LOG_MESSAGE);
  }
}
