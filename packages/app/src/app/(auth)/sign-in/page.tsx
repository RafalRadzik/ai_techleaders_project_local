import Link from 'next/link';
import { redirect } from 'next/navigation';
import { safeReturnTo } from '@devmentor/core';
import { Button } from '@devmentor/ui';
import { AuthLayout, ErrorMessage } from '@devmentor/ui/backend';
import { getPageSession, homeFor } from '../../../lib/session';
import { EmailSignInForm } from './EmailSignInForm';
import {
  firstParam,
  githubSignInHref,
  registerHref,
  signInNotice,
  type SignInSearchParams,
} from './sign-in-notices';

// Reads the session cookie: never prerendered.
export const dynamic = 'force-dynamic';

/**
 * `/sign-in` (public auth surface). GitHub is the first action and a plain link to the
 * navigated start route; the email form below it posts JSON to `/api/auth/login`. A safe
 * `returnTo` rides along with both. A visitor who already holds a live session never sees
 * the form.
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
      description="Sign in with GitHub, or with the email address and password you registered. Your first GitHub sign-in creates your account."
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
        <EmailSignInForm returnTo={returnTo} />
        <p className="dm-account-switch">
          <span>New to DevMentor?</span>
          <Button asChild variant="link">
            <Link href={registerHref(returnTo)}>Create an account</Link>
          </Button>
        </p>
      </div>
    </AuthLayout>
  );
}
