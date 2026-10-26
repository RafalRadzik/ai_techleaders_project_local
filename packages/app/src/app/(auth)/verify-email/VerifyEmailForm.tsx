'use client';

import { verifyEmailSchema } from '@devmentor/core/validators/auth/verify-email.schema';
import { CrudForm, type CrudField, type CrudFormError } from '@devmentor/ui/backend';

const FIELDS: CrudField[] = [{
  name: 'password',
  label: 'Password',
  type: 'password',
  required: true,
  autoComplete: 'new-password',
  description: 'Use at least 12 characters. This replaces the password entered during registration.',
}];

export function verificationErrorCopy(error: CrudFormError): string | undefined {
  switch (error.code) {
    case 'bad_request':
      return 'This confirmation link is invalid, expired, or already used. Register again to get a new link, or sign in if you already confirmed your email.';
    case 'service_unavailable':
      return 'We could not finish confirming your email. Try again in a few minutes.';
    default:
      return undefined;
  }
}

export function VerifyEmailForm({ token }: { token: string }) {
  return (
    <CrudForm
      schema={verifyEmailSchema}
      fields={FIELDS}
      endpoint="/api/auth/verify-email"
      hiddenValues={{ token }}
      submitLabel="Set password and sign in"
      pendingLabel="Confirming email…"
      renderError={verificationErrorCopy}
      onSuccess={(data) => window.location.assign((data as { landingPath: string }).landingPath)}
    />
  );
}
