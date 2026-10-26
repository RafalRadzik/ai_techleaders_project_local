// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { AppShell } from './AppShell';
import { AuthLayout } from './AuthLayout';
afterEach(cleanup);
it('renders the chrome landmarks, user block and an arbitrary nav slot verbatim', () => {
  render(<AppShell nav={<ul><li><button type="button">Mentor availability</button></li><li>Coming soon</li></ul>} user={{displayName:'Jordan Lee'}}><p>Body</p></AppShell>);
  const nav=screen.getByRole('navigation', {name:'Workspace navigation'});
  expect(within(nav).getByRole('list')).toBeTruthy();
  expect(within(nav).getByRole('button', {name:'Mentor availability'})).toBeTruthy();
  expect(within(nav).getByText('Coming soon')).toBeTruthy();
  expect(within(nav).queryByRole('link')).toBeNull();
  expect(screen.getByText('DevMentor')).toBeTruthy();
  const banner=screen.getByRole('banner');
  expect(within(banner).queryByRole('button')).toBeNull();
  expect(within(screen.getByRole('main')).getByText('Body')).toBeTruthy();
  const userBlock=screen.getByText('Signed in as').parentElement!;
  expect(within(userBlock).getByText('Jordan Lee').tagName).toBe('STRONG');
});
it('renders supplied navigation/actions and a unique skip target without inferring roles', () => {
  render(<><AppShell className="custom" nav={<a href="/admin/users">Users</a>} user={{displayName:'Alex'}} actions={<button>Sign out</button>}><h1>Workspace</h1></AppShell><AppShell nav={<a href="/sessions">Sessions</a>} user={{displayName:'Sam'}}>Second workspace</AppShell></>);
  expect(screen.getByRole('link', { name:'Users' }).getAttribute('href')).toBe('/admin/users');
  expect(within(screen.getAllByRole('banner')[0]!).getByRole('button', { name:'Sign out' })).toBeTruthy();
  expect(screen.getAllByRole('main')[0]!.closest('.custom')).toBeTruthy();
  expect(screen.getByText('Alex')).toBeTruthy();
  const mains=screen.getAllByRole('main');
  const links=screen.getAllByRole('link', {name:'Skip to content'});
  expect(mains[0]!.id).not.toBe(mains[1]!.id);
  expect(links[0]!.getAttribute('href')).toBe(`#${mains[0]!.id}`);
  expect(mains[0]!.tabIndex).toBe(-1);
});
it('gives authentication a heading, descriptive copy and form/footer slots', () => {
  const { rerender }=render(<AuthLayout title="Welcome back" description="Continue your mentorship." footer={<a href="/help">Get help</a>}><button>Continue with GitHub</button></AuthLayout>);
  expect(screen.getByRole('heading', {level:1,name:'Welcome back'})).toBeTruthy();
  expect(screen.getByRole('link', {name:'Get help'})).toBeTruthy();
  rerender(<AuthLayout title="Check your inbox" description="Open your verification email."><p>Verification sent</p></AuthLayout>);
  expect(screen.getByText('Verification sent')).toBeTruthy();
});
