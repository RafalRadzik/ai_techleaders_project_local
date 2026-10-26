/** One plain-text message to one recipient. */
export type MailMessage = {
  to: string;
  subject: string;
  text: string;
};

/**
 * The outbound mail port (B14). `send` resolves only once the message has been accepted
 * for delivery; any failure (transport down, timeout, missing configuration) rejects with
 * `ServiceUnavailableError`, so a caller never reports success without delivery.
 */
export interface Mailer {
  send(message: MailMessage): Promise<void>;
}
