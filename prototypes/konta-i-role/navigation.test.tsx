import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { backend, controller, scenarios } from './runtime';
import { Screens } from './Screens';
import { PrototypeProvider } from './store';

const SCREEN_IDS = ['s01', 's02', 's03', 's04', 's05', 's06', 's07', 's08', 's09', 's10'];

/** Stands in for the review engine: shows one screen and announces it, like prototype.js does. */
function goTo(id: string) {
  document.querySelectorAll('.screen').forEach((node) => node.classList.remove('is-current'));
  document.getElementById(id)!.classList.add('is-current');
  document.dispatchEvent(new CustomEvent('prototype:screen-change', { detail: id }));
}
const onNavigate = (event: Event) => goTo((event as CustomEvent<string>).detail);
const current = () => document.querySelector('.screen.is-current')?.id;
const settle = () => act(() => { vi.advanceTimersByTime(4000); });
const screen = (id: string) => within(document.getElementById(id)!);
const click = (element: HTMLElement) => { act(() => { fireEvent.click(element); }); settle(); };

beforeEach(() => {
  vi.useFakeTimers();
  document.addEventListener('prototype:navigate', onNavigate);
  render(<PrototypeProvider runtime={{ controller, backend, scenarios }}><Screens /></PrototypeProvider>);
  act(() => { controller.reset(); });
  act(() => goTo('s01'));
});

afterEach(() => {
  cleanup();
  document.removeEventListener('prototype:navigate', onNavigate);
  vi.useRealTimers();
});

describe('screen IDs', () => {
  it('keeps the ten IDs from the screen map, in order, each with a frame', () => {
    const ids = [...document.querySelectorAll('.screen')].map((node) => node.id);
    expect(ids).toEqual(SCREEN_IDS);
    for (const id of ids) expect(document.querySelector(`#${id} .frame`)).not.toBeNull();
  });

  it('gives every screen a reviewer note with stories, simulation and open points', () => {
    for (const id of SCREEN_IDS) {
      const note = document.querySelector(`#${id} .notes`)!.textContent!;
      expect(note, id).toContain('Stories:');
      expect(note, id).toContain('Simulated:');
      expect(note, id).toContain('Not settled here:');
    }
  });
});

describe('navigation between screens', () => {
  it('moves from home to sign-in, registration and back', () => {
    click(screen('s01').getAllByRole('button', { name: 'Sign in' })[0]);
    expect(current()).toBe('s02');
    click(screen('s02').getByRole('button', { name: 'Create account' }));
    expect(current()).toBe('s03');
    click(screen('s03').getByRole('button', { name: 'Sign in' }));
    expect(current()).toBe('s02');
    click(screen('s02').getByRole('button', { name: 'Back to home' }));
    expect(current()).toBe('s01');
  });

  it('opens the GitHub simulation and returns a cancel to sign-in with a message', () => {
    act(() => goTo('s02'));
    click(screen('s02').getByRole('button', { name: 'Continue with GitHub' }));
    expect(current()).toBe('s05');
    click(screen('s05').getByRole('button', { name: 'Cancel' }));
    expect(current()).toBe('s02');
    expect(screen('s02').getByText('GitHub sign-in was cancelled')).toBeTruthy();
  });

  it('signs in through GitHub and lands on the mentee home, then signs out to the home page', () => {
    act(() => goTo('s05'));
    click(screen('s05').getByRole('button', { name: 'Authorize DevMentor' }));
    expect(current()).toBe('s06');
    expect(screen('s06').getByRole('heading', { level: 1 }).textContent).toBe('Welcome, Alex Demo');
    click(screen('s06').getByRole('button', { name: 'Sign out' }));
    expect(current()).toBe('s01');
    expect(screen('s01').getByText('You are signed out')).toBeTruthy();
  });

  it('sends a signed-out visitor from a guarded screen to sign-in (s02.16)', () => {
    act(() => goTo('s07'));
    settle();
    expect(current()).toBe('s02');
    expect(screen('s02').getByText('Sign in to open the mentor home.')).toBeTruthy();
  });

  it('shows the links for every role an account holds, and only those', () => {
    act(() => { controller.switchAccount('sam'); });
    settle();
    expect(current()).toBe('s08');
    const links = within(document.querySelector('#s08 nav')! as HTMLElement).getAllByRole('link').map((link) => link.getAttribute('href'));
    expect(links).toEqual(['#s08', '#s09', '#s07']);
    act(() => { controller.switchAccount('nina'); });
    settle();
    expect(within(document.querySelector('#s06 nav')! as HTMLElement).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(['#s06']);
  });

  it('refuses a mentee on the mentor page and shows the message on the own home (s10.1)', () => {
    act(() => { controller.switchAccount('nina'); });
    settle();
    act(() => goTo('s07'));
    settle();
    expect(current()).toBe('s10');
    expect(screen('s10').getByText('This page is not available to your account')).toBeTruthy();
  });

  it('opens the operator list from the operator home', () => {
    act(() => { controller.switchAccount('founder-a'); });
    settle();
    click(screen('s08').getByRole('button', { name: 'Open users' }));
    expect(current()).toBe('s09');
    expect(screen('s09').getByRole('table')).toBeTruthy();
  });
});

describe('no dead buttons', () => {
  const pressable = (id: string) => [...document.querySelectorAll<HTMLButtonElement>(`#${id} button`)].filter((button) => !button.disabled && !button.form);
  const signature = () => `${current()}|${controller.version()}|${document.body.innerHTML.length}`;

  it('does something for every enabled button on the public screens', () => {
    for (const id of ['s01', 's02', 's03', 's04', 's05']) {
      const count = pressable(id).length;
      expect(count, id).toBeGreaterThan(0);
      for (let index = 0; index < count; index += 1) {
        act(() => { controller.reset(); });
        act(() => goTo(id));
        // s04 needs a pending registration to show its email actions.
        if (id === 's04') act(() => { controller.registered('pat@devmentor.test'); });
        const button = pressable(id)[index];
        const before = signature();
        click(button);
        expect(signature(), `${id} "${button.textContent}"`).not.toBe(before);
      }
    }
  });

  it('does something for every enabled button on the signed-in screens', () => {
    const accounts: Record<string, string[]> = { nina: ['s06'], ada: ['s07'], 'founder-a': ['s08', 's09'], sam: ['s10'] };
    for (const [account, ids] of Object.entries(accounts)) {
      for (const id of ids) {
        const count = (() => {
          act(() => { controller.reset(); controller.switchAccount(account); });
          settle();
          act(() => goTo(id));
          settle();
          return pressable(id).length;
        })();
        expect(count, `${account} ${id}`).toBeGreaterThan(0);
        for (let index = 0; index < count; index += 1) {
          act(() => { controller.reset(); controller.switchAccount(account); });
          settle();
          act(() => goTo(id));
          settle();
          const button = pressable(id)[index];
          const before = signature();
          click(button);
          expect(signature(), `${account} ${id} "${button.textContent}"`).not.toBe(before);
        }
      }
    }
  });
});
