'use client';

import { WorkflowAction } from '@devmentor/ui/backend';

/** The logout route; sign-out needs CSRF (sent by `apiCall`) but no live session. */
export const SIGN_OUT_ENDPOINT = '/api/auth/logout';

/**
 * Sign out of every session, then load `/` from the server. A full navigation rather
 * than a client-side push: the server-rendered tree still holds the signed-in user, and
 * a soft push could keep showing that chrome until the next server round trip.
 */
export function SignOutButton() {
  return (
    <WorkflowAction
      endpoint={SIGN_OUT_ENDPOINT}
      label="Sign out"
      pendingLabel="Signing out…"
      intent="neutral"
      appearance="ghost"
      // Deliberately not `router.push`: a soft navigation could render stale signed-in chrome.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      onSuccess={() => window.location.assign('/')}
    />
  );
}
