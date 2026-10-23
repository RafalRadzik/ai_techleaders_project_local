// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ usePathname: vi.fn() }));

const { usePathname } = await import('next/navigation');
const { NavLinks } = await import('./NavLinks');

const items = [
  { href: '/admin', label: 'Operator home' },
  { href: '/admin/users', label: 'Users' },
];

afterEach(cleanup);

describe('NavLinks', () => {
  it('renders one link per item and marks only the current one', () => {
    vi.mocked(usePathname).mockReturnValue('/admin/users');
    render(<NavLinks items={items} />);
    const users = screen.getByRole('link', { name: 'Users' });
    const operatorHome = screen.getByRole('link', { name: 'Operator home' });
    expect(users.getAttribute('href')).toBe('/admin/users');
    expect(users.getAttribute('aria-current')).toBe('page');
    expect(operatorHome.getAttribute('href')).toBe('/admin');
    expect(operatorHome.hasAttribute('aria-current')).toBe(false);
  });

  it('marks nothing when the path belongs to no item', () => {
    vi.mocked(usePathname).mockReturnValue('/home');
    render(<NavLinks items={items} />);
    expect(screen.getAllByRole('link').some((link) => link.hasAttribute('aria-current'))).toBe(false);
  });
});
