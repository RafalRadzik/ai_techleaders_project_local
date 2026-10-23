import type { ReactNode } from 'react';
import { SignedInFrame } from '../../components/shell/SignedInFrame';
import { requirePageRole } from '../../lib/session';

export const dynamic = 'force-dynamic';

/** Mentor surface. Guards before rendering; every page beneath guards again. */
export default async function MentorLayout({ children }: { children: ReactNode }) {
  await requirePageRole('mentor', '/mentor');
  return <SignedInFrame surface="Mentor">{children}</SignedInFrame>;
}
