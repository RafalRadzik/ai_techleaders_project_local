'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { currentHref, type NavItem } from '../../lib/nav';

/** The `AppShell` nav slot: one `next/link` per item, the current one marked for AT. */
export function NavLinks({ items }: { items: readonly NavItem[] }) {
  const current = currentHref(items, usePathname());
  return (
    <>
      {items.map((item) => (
        <Link key={item.href} href={item.href} aria-current={item.href === current ? 'page' : undefined}>
          {item.label}
        </Link>
      ))}
    </>
  );
}
