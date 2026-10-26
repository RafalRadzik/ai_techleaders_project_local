import type { ReactNode } from 'react';
import { AppShell } from '@devmentor/ui/backend';
import { navFor } from '../../lib/nav';
import { requirePageUser, type Role } from '../../lib/session';
import { SignOutButton } from '../auth/SignOutButton';
import { NavLinks } from './NavLinks';

/**
 * The signed-in chrome shared by the mentee, mentor and admin layouts. Called after the
 * layout's own guard; it reads the caller's user for the name in the shell and builds the
 * navigation from every role they hold. A session that lapsed in between still redirects.
 */
export async function signedInShell(role: Role, currentPath: string, children: ReactNode) {
  const { session, user } = await requirePageUser(role, currentPath);
  return (
    <AppShell
      nav={<NavLinks items={navFor(session.roles)} />}
      user={{ displayName: user.displayName }}
      actions={<SignOutButton />}
    >
      {children}
    </AppShell>
  );
}
