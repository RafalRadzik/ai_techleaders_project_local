import { EmptyState } from '@devmentor/ui/backend';
import { requirePageUser } from '../../../lib/session';

export const dynamic = 'force-dynamic';

/** `/home` — the mentee home: a greeting and, until booking ships, an empty state. */
export default async function MenteeHomePage() {
  const { user } = await requirePageUser('mentee', '/home');
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome, {user.displayName}</h1>
        <p className="text-sm text-muted-foreground">This is your mentee home.</p>
      </div>
      <EmptyState
        title="No sessions yet"
        description="Your sessions with mentors will be listed here."
      />
    </div>
  );
}
