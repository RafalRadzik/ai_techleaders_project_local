import type { ReactNode } from 'react';
import { signedInShell } from '../../components/shell/signed-in-shell';
import { requirePageRole } from '../../lib/session';

export const dynamic = 'force-dynamic';

/** Mentor surface. Guards before rendering; every page beneath guards again. */
export default async function MentorLayout({ children }: { children: ReactNode }) {
  await requirePageRole('mentor', '/mentor');
  return signedInShell('mentor', '/mentor', children);
}
