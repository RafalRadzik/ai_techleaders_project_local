import type { ReactNode } from 'react';
import Link from 'next/link';
import { SignOutButton } from '../auth/SignOutButton';

/**
 * Minimal chrome for the mentee and mentor surfaces: the brand, which surface this is,
 * and sign-out. Deliberately plain — Slice 3 ports the signed-in layouts to `AppShell`.
 */
export function SignedInFrame({ surface, children }: { surface: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <Link href="/" className="text-lg font-semibold tracking-tight">
              DevMentor
            </Link>
            <p className="text-xs text-muted-foreground">{surface}</p>
          </div>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
