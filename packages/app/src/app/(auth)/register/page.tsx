import Link from 'next/link';
import { redirect } from 'next/navigation';
import { safeReturnTo } from '@devmentor/core';
import { AuthLayout } from '@devmentor/ui/backend';
import { getPageSession, homeFor } from '../../../lib/session';
import {
  firstParam,
  githubSignInHref,
  signInHref,
  type SignInSearchParams,
} from '../sign-in/sign-in-notices';
import { RegisterForm } from './RegisterForm';

// Reads the session cookie: never prerendered.
export const dynamic = 'force-dynamic';

/**
 * `/register` (public auth surface, #13). GitHub first, then an email form posting JSON to
 * `/api/auth/register`. A safe `returnTo` rides along, so the verification link lands
 * there. A visitor who already holds a live session goes to their role home instead.
 */
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<SignInSearchParams>;
}) {
  const session = await getPageSession();
  if (session) redirect(homeFor(session.roles));

  const returnTo = safeReturnTo(firstParam((await searchParams).returnTo), '');

  return (
    <AuthLayout
      title="Create your account"
      description="Continue with GitHub, or register with your email address and a password. Open the email link, then choose your final password to confirm the address and sign in."
      footer={<Link href="/">Back to the home page</Link>}
    >
      <RegisterForm
        returnTo={returnTo}
        githubHref={githubSignInHref(returnTo)}
        signInHref={signInHref(returnTo)}
      />
    </AuthLayout>
  );
}
