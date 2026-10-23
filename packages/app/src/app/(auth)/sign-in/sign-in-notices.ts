import type { SignInError } from '@devmentor/core';

/**
 * Every outcome the sign-in routes send back to `/sign-in`: `?cancelled=1` and each
 * `SignInError`, including `verification` from the email link. Typed against
 * `SignInError`, so a new code in core fails `typecheck` until it has copy here.
 */
export const SIGN_IN_NOTICES: Record<SignInError | 'cancelled', string> = {
  cancelled: 'Sign-in was cancelled. No account was created.',
  state:
    'We could not verify this sign-in request, so you are not signed in. Sign in with GitHub again.',
  unavailable:
    'GitHub sign-in is not configured yet, or GitHub did not respond. Try again in a few minutes.',
  no_verified_email:
    'Your GitHub account has no verified primary email, so no account was created. Verify it in your GitHub email settings, then sign in again.',
  email_unverified:
    'A DevMentor account already uses this email, but the address is not verified, so GitHub was not connected to it. Verify that address first with the link in your verification email, then sign in with GitHub again.',
  github_account_mismatch:
    'This email belongs to a DevMentor account connected to a different GitHub account. Sign in with that GitHub account instead.',
  no_active_role:
    'Your account no longer has access to DevMentor. Contact the DevMentor team if you think this is a mistake.',
  verification:
    'This verification link has expired or is no longer valid. Register again with the same email address to get a new link, then open the link in that email.',
};

export type SignInSearchParams = Record<string, string | string[] | undefined>;

/** A repeated query parameter counts by its first value. */
export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** The notice for this visit, or `null`. An unknown `?error=` shows nothing and is never echoed. */
export function signInNotice(params: SignInSearchParams): string | null {
  if (firstParam(params.cancelled) === '1') return SIGN_IN_NOTICES.cancelled;
  const error = firstParam(params.error);
  if (error === undefined || error === 'cancelled' || !Object.hasOwn(SIGN_IN_NOTICES, error)) {
    return null;
  }
  return SIGN_IN_NOTICES[error as keyof typeof SIGN_IN_NOTICES];
}

function withReturnTo(path: string, returnTo: string): string {
  return returnTo ? `${path}?returnTo=${encodeURIComponent(returnTo)}` : path;
}

/** `/register`, carrying a safe `returnTo` through to the verification link. */
export function registerHref(returnTo: string): string {
  return withReturnTo('/register', returnTo);
}

/** `/sign-in`, carrying a safe `returnTo` through. */
export function signInHref(returnTo: string): string {
  return withReturnTo('/sign-in', returnTo);
}

/** The GitHub start route, carrying a safe `returnTo` through (the route re-sanitises it). */
export function githubSignInHref(returnTo: string): string {
  return withReturnTo('/api/auth/github', returnTo);
}
