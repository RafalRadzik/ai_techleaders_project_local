import type { ReactNode } from 'react';
import { SignedInFrame } from '../../components/shell/SignedInFrame';
import { requirePageRole } from '../../lib/session';

export const dynamic = 'force-dynamic';

/** Mentee surface. Guards before rendering; every page beneath guards again. */
export default async function MenteeLayout({ children }: { children: ReactNode }) {
  await requirePageRole('mentee', '/home');
  return <SignedInFrame surface="Mentee">{children}</SignedInFrame>;
}
