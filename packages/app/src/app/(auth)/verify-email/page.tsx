import Link from 'next/link';
import type { Metadata } from 'next';
import { AuthLayout, ErrorMessage } from '@devmentor/ui/backend';
import { firstParam } from '../sign-in/sign-in-notices';
import { VerifyEmailForm } from './VerifyEmailForm';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  referrer: 'no-referrer',
  robots: { index: false, follow: false },
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const token = firstParam((await searchParams).token);
  return (
    <AuthLayout
      title="Set your password"
      description="Choose the password you want to use for DevMentor. Submitting this form confirms your email address and signs you in."
      footer={<Link href="/sign-in">Back to sign in</Link>}
    >
      {token ? (
        <VerifyEmailForm token={token} />
      ) : (
        <ErrorMessage message="Open the link in your confirmation email, or register again to get a new link." />
      )}
      <p className="dm-account-switch">
        <Link href="/register">Register again</Link>
      </p>
    </AuthLayout>
  );
}
