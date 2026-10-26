import type { ReactNode } from 'react';
import { signedInShell } from '../../components/shell/signed-in-shell';
import { requirePageRole } from '../../lib/session';

export const dynamic = 'force-dynamic';

/** Mentee surface. Guards before rendering; every page beneath guards again. */
export default async function MenteeLayout({ children }: { children: ReactNode }) {
  await requirePageRole('mentee', '/home');
  return signedInShell('mentee', '/home', children);
}
