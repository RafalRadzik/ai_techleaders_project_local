'use client';

import { loginSchema } from '@devmentor/core/validators/auth/login.schema';
import { CrudForm, type CrudField, type CrudFormError } from '@devmentor/ui/backend';
import { waitTime } from '../../../components/auth/wait-time';

/** The JSON-only login route, called through `CrudForm` so the CSRF header rides along. */
export const LOGIN_ENDPOINT = '/api/auth/login';

const FIELDS: CrudField[] = [
  { name: 'email', label: 'Email address', type: 'email', required: true, autoComplete: 'email' },
  {
    name: 'password',
    label: 'Password',
    type: 'password',
    required: true,
    autoComplete: 'current-password',
  },
];

/**
 * Copy for a failed sign-in. A 401 never says which part was wrong (edge case 13); the
 * 403 refusals (unverified email, no active role) keep the server's reason, which only
 * someone holding the right password ever sees.
 */
export function signInErrorCopy(error: CrudFormError): string | undefined {
  switch (error.code) {
    case 'unauthorized':
      return 'Invalid credentials. Check your email address and password, then try again.';
    case 'rate_limited':
      return `Too many sign-in attempts. Wait ${waitTime(error.retryAfterSeconds)}, then try again.`;
    case 'service_unavailable':
      return 'Sign-in is unavailable right now. Try again in a few minutes.';
    default:
      return undefined;
  }
}

/**
 * The email half of `/sign-in`. On success the browser loads the server-chosen landing
 * path (a safe `returnTo` or the role home) with a full navigation, so the next page is
 * rendered with the new session cookie rather than a stale signed-out tree.
 */
export function EmailSignInForm({ returnTo }: { returnTo: string }) {
  return (
    <fieldset className="dm-account-email">
      <legend className="dm-account-legend">Sign in with email</legend>
      <CrudForm
        schema={loginSchema}
        fields={FIELDS}
        endpoint={LOGIN_ENDPOINT}
        hiddenValues={returnTo ? { returnTo } : undefined}
        submitLabel="Sign in"
        pendingLabel="Signing in…"
        renderError={signInErrorCopy}
        // A full navigation; the landing path is same-origin (`safeReturnTo` or a role home).
        onSuccess={(data) => window.location.assign((data as { landingPath: string }).landingPath)}
      />
    </fieldset>
  );
}
