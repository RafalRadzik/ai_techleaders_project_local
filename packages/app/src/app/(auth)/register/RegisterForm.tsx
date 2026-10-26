'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { registerSchema } from '@devmentor/core/validators/auth/register.schema';
import { Alert, AlertDescription, AlertTitle, Button } from '@devmentor/ui';
import { CrudForm, type CrudField, type CrudFormError } from '@devmentor/ui/backend';
import { waitTime } from '../../../components/auth/wait-time';

/** The JSON-only registration route, called through `CrudForm`. */
export const REGISTER_ENDPOINT = '/api/auth/register';

const FIELDS: CrudField[] = [
  {
    name: 'displayName',
    label: 'Display name',
    required: true,
    autoComplete: 'name',
    description: 'Mentors see this name on your bookings and messages.',
  },
  { name: 'email', label: 'Email address', type: 'email', required: true, autoComplete: 'email' },
  {
    name: 'password',
    label: 'Password',
    type: 'password',
    required: true,
    autoComplete: 'new-password',
    description: 'Use at least 12 characters. After opening the email link, you will choose your final sign-in password.',
  },
];

export interface RegisterLinks {
  /** The GitHub start route, carrying the safe `returnTo`. */
  githubHref: string;
  /** `/sign-in`, carrying the safe `returnTo`. */
  signInHref: string;
}

/**
 * Copy for a failed registration. A 409 keeps the server's message (which says when the
 * address signs in with GitHub) and links to both sign-in methods; the 429 names the wait;
 * the 503 says the confirmation email was not sent, so nothing is half done.
 */
export function registerErrorCopy(error: CrudFormError, links: RegisterLinks): ReactNode {
  switch (error.code) {
    case 'conflict':
      return (
        <>
          <p>{error.message}</p>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            <a className="font-medium underline" href={links.githubHref}>
              Continue with GitHub
            </a>
            <Link className="font-medium underline" href={links.signInHref}>
              Sign in with email
            </Link>
          </p>
        </>
      );
    case 'rate_limited':
      return `Too many registration attempts from this network. Wait ${waitTime(error.retryAfterSeconds)}, then try again.`;
    case 'service_unavailable':
      return 'We could not send your confirmation email, so your account is not ready yet. Try again in a few minutes. Your entries are still here.';
    default:
      return undefined;
  }
}

function CheckInbox({
  email,
  signInHref,
  onRestart,
}: {
  email: string;
  signInHref: string;
  onRestart: () => void;
}) {
  return (
    <div className="dm-account-form">
      <Alert role="status" className="dm-auth-feedback">
        <AlertTitle>Check your inbox at {email}</AlertTitle>
        <AlertDescription>
          <p>
            Open the link in the email we sent, then set your password to confirm your address and sign in. The link
            works for 24 hours.
          </p>
          <p>
            No email after a few minutes? Check your spam folder, or register again with the same
            address to get a new link.
          </p>
        </AlertDescription>
      </Alert>
      <Button type="button" intent="neutral" appearance="stroke" onClick={onRestart}>
        Register again
      </Button>
      <Button asChild variant="link">
        <Link href={signInHref}>Back to sign in</Link>
      </Button>
    </div>
  );
}

/**
 * Everything below the `/register` heading: GitHub first, then the email form. A
 * successful registration replaces both with the check-your-inbox state; it sets no
 * cookie, because password completion after opening the emailed link signs the user in.
 */
export function RegisterForm({ returnTo, githubHref, signInHref }: RegisterLinks & { returnTo: string }) {
  const [sentTo, setSentTo] = useState<string | null>(null);

  if (sentTo) {
    return <CheckInbox email={sentTo} signInHref={signInHref} onRestart={() => setSentTo(null)} />;
  }

  return (
    <div className="dm-account-form">
      <Button asChild intent="neutral" appearance="stroke" className="dm-account-provider">
        <a href={githubHref}>Continue with GitHub</a>
      </Button>
      <div className="dm-account-divider" aria-hidden="true">
        or use your email
      </div>
      <fieldset className="dm-account-email">
        <legend className="dm-account-legend">Create an account with email</legend>
        <CrudForm
          schema={registerSchema}
          fields={FIELDS}
          endpoint={REGISTER_ENDPOINT}
          hiddenValues={returnTo ? { returnTo } : undefined}
          submitLabel="Create account"
          pendingLabel="Creating account…"
          renderError={(error) => registerErrorCopy(error, { githubHref, signInHref })}
          onSuccess={(data) => setSentTo((data as { email: string }).email)}
        />
      </fieldset>
      <p className="dm-account-switch">
        <span>Already have an account?</span>
        <Button asChild variant="link">
          <Link href={signInHref}>Sign in</Link>
        </Button>
      </p>
    </div>
  );
}
