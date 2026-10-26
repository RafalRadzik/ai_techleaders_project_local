'use client';

import { Button } from '@devmentor/ui';
import { ErrorMessage } from '@devmentor/ui/backend';

export default function ApplicationError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">Page unavailable</h1>
      <ErrorMessage
        message="We couldn't load this page. Try again in a moment."
        action={<Button onClick={retry}>Try again</Button>}
      />
    </main>
  );
}
