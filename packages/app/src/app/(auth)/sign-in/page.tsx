import Link from 'next/link';
import { redirect } from 'next/navigation';
import { safeReturnTo } from '@devmentor/core';
import { Button, Input, Label } from '@devmentor/ui';
import { AuthLayout, ErrorMessage } from '@devmentor/ui/backend';
import { getPageSession, homeFor } from '../../../lib/session';
import {
  firstParam,
  githubSignInHref,
  signInNotice,
  type SignInSearchParams,
} from './sign-in-notices';

// Reads the session cookie: never prerendered.
export const dynamic = 'force-dynamic';

/**
 * `/sign-in` (public auth surface). GitHub is the first action and a plain link to the
 * navigated start route; the email form is shown disabled until email sign-in ships
 * (Slice 4). A visitor who already holds a live session never sees the form.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<SignInSearchParams>;
}) {
  const session = await getPageSession();
  if (session) redirect(homeFor(session.roles));

  const params = await searchParams;
  const notice = signInNotice(params);
  const returnTo = safeReturnTo(firstParam(params.returnTo), '');

  return (
    <AuthLayout
      title="Sign in"
      description="Use your GitHub account to sign in. Your first sign-in creates your DevMentor account."
      footer={<Link href="/">Back to the home page</Link>}
    >
      <div className="dm-account-form">
        {notice && <ErrorMessage message={notice} />}
        <Button asChild intent="neutral" appearance="stroke" className="dm-account-provider">
          <a href={githubSignInHref(returnTo)}>Sign in with GitHub</a>
        </Button>
        <div className="dm-account-divider" aria-hidden="true">
          or use your email
        </div>
        <fieldset className="dm-account-email" disabled aria-describedby="email-sign-in-note">
          <legend className="dm-account-legend">Sign in with email</legend>
          <p id="email-sign-in-note" className="dm-account-email-unavailable">
            Email sign-in is not available yet. Use GitHub to sign in.
          </p>
          <div className="dm-form">
            <div className="dm-field">
              <Label htmlFor="sign-in-email">Email address</Label>
              <Input id="sign-in-email" name="email" type="email" autoComplete="email" />
            </div>
            <div className="dm-field">
              <Label htmlFor="sign-in-password">Password</Label>
              <Input
                id="sign-in-password"
                name="password"
                type="password"
                autoComplete="current-password"
              />
            </div>
            <div className="dm-form-actions">
              <Button type="button">Sign in</Button>
            </div>
          </div>
        </fieldset>
      </div>
    </AuthLayout>
  );
}
