import { EmptyState } from '@devmentor/ui/backend';
import { requirePageUser } from '../../../lib/session';

export const dynamic = 'force-dynamic';

/** `/mentor` — the mentor home: a greeting and an empty state, with no promises yet. */
export default async function MentorHomePage() {
  const { user } = await requirePageUser('mentor', '/mentor');
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome, {user.displayName}</h1>
        <p className="text-sm text-muted-foreground">This is your mentor home.</p>
      </div>
      <EmptyState title="Nothing to manage yet" />
    </div>
  );
}
