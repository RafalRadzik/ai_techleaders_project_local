import { describe, expect, it } from 'vitest';
import { createBackend } from './backend';
import { createController, type Controller } from './controller';
import { createScenarios } from './scenario';

/** Drives the controller the way the review engine does: navigate() lands on a screen and calls enter(). */
function setup() {
  const scenarios = createScenarios();
  const backend = createBackend(scenarios.now);
  const queue: (() => void)[] = [];
  const trail: string[] = [];
  const holder: { controller?: Controller } = {};
  const navigate = (id: string) => { trail.push(id); holder.controller!.enter(id); };
  const controller = createController({ backend, scenarios, navigate, schedule: (fn) => { queue.push(fn); } });
  holder.controller = controller;
  const flush = () => { while (queue.length) queue.shift()!(); };
  const open = (id: string) => { navigate(id); flush(); };
  return { scenarios, backend, controller, trail, flush, open, state: () => controller.state };
}

describe('guards and redirects', () => {
  it('sends a signed-out visitor to sign-in and returns to the page after sign-in (s06.5, s02.16)', () => {
    const t = setup();
    t.open('s07');
    expect(t.trail.at(-1)).toBe('s02');
    expect(t.controller.stateOf('s02')).toBe('s02.16');
    expect(t.state().returnTo).toBe('s07');
    t.controller.loggedIn(t.backend.signInAs('ada').ok ? t.backend.user()! : null!);
    t.flush();
    expect(t.trail.at(-1)).toBe('s07');
    expect(t.controller.stateOf('s07')).toBe('s07.2');
  });

  it('ignores a hostile returnTo and lands on the role home (p15, EC22)', () => {
    const t = setup();
    t.scenarios.set({ returnTo: 'hostile' });
    t.open('s07');
    expect(t.state().returnTo).toBe('//evil.example');
    t.controller.loggedIn(t.backend.signInAs('nina').ok ? t.backend.user()! : null!);
    expect(t.trail.at(-1)).toBe('s06');
  });

  it('asks to sign in again when the session expired (s06.4, s02.9)', () => {
    const t = setup();
    t.controller.switchAccount('nina');
    t.open('s06');
    expect(t.controller.stateOf('s06')).toBe('s06.2');
    t.controller.expireSession();
    t.open('s06');
    expect(t.trail.at(-1)).toBe('s02');
    expect(t.controller.stateOf('s02')).toBe('s02.9');
    expect(t.state().known).toBeNull();
    expect(t.backend.sessionState()).toBe('none');
  });

  it('expires after the demo clock advances 24 hours (p18)', () => {
    const t = setup();
    t.controller.switchAccount('nina');
    t.controller.advanceClock();
    expect(t.backend.sessionState()).toBe('expired');
  });

  it('refuses a wrong role and lands on the own home with a message (s10.1, s10.2)', () => {
    const t = setup();
    t.controller.switchAccount('nina');
    t.open('s07');
    expect(t.trail.at(-1)).toBe('s10');
    expect(t.controller.stateOf('s10')).toBe('s10.1');
    t.open('s09');
    expect(t.controller.stateOf('s10')).toBe('s10.2');
    expect(t.state().denied).toBe('forbidden');
  });

  it('refuses a revoked operator on the next request and restores without a new sign-in (s08.6, s09.6, s10.3, s08.7)', () => {
    const t = setup();
    t.controller.switchAccount('sam');
    t.open('s08');
    t.controller.setOperatorAccess(false);
    expect(t.state().known?.roles).toContain('operator');
    t.open('s09');
    expect(t.trail.at(-1)).toBe('s10');
    expect(t.state().denied).toBe('operator-revoked');
    expect(t.controller.stateOf('s10')).toBe('s10.3');
    expect(t.state().known?.roles).toEqual(['mentor']);
    t.controller.setOperatorAccess(true);
    t.flush();
    expect(t.trail.at(-1)).toBe('s08');
    expect(t.state().pages.s08.phase).toBe('ready');
    expect(t.state().known?.roles).toContain('operator');
  });

  it('redirects a signed-in visitor away from sign-in and registration (s02.15, s03.10)', () => {
    const t = setup();
    t.controller.switchAccount('ada');
    t.open('s02');
    expect(t.trail.at(-1)).toBe('s07');
    t.open('s03');
    expect(t.trail.at(-1)).toBe('s07');
  });
});

describe('page loading states', () => {
  it('checks the session before showing anything and shows a database failure once (s06.3, s06.7)', () => {
    const t = setup();
    t.controller.switchAccount('nina');
    t.scenarios.set({ nextRequest: 'database' });
    t.controller.enter('s06');
    expect(t.controller.stateOf('s06')).toBe('s06.3');
    t.flush();
    expect(t.controller.stateOf('s06')).toBe('s06.7');
    expect(t.scenarios.get().nextRequest).toBe('ok');
    t.controller.retryPage('s06');
    t.flush();
    expect(t.state().pages.s06.phase).toBe('ready');
  });

  it('covers the operator pages (s08.2, s08.8, s09.2, s09.3, s09.4)', () => {
    const t = setup();
    t.controller.switchAccount('founder-a');
    t.controller.enter('s08');
    expect(t.controller.stateOf('s08')).toBe('s08.2');
    t.flush();
    t.scenarios.set({ nextRequest: 'unavailable' });
    t.open('s08');
    expect(t.controller.stateOf('s08')).toBe('s08.8');
    t.controller.enter('s09');
    expect(t.controller.stateOf('s09')).toBe('s09.2');
    t.flush();
    t.scenarios.set({ nextRequest: 'database' });
    t.open('s09');
    expect(t.controller.stateOf('s09')).toBe('s09.4');
    t.scenarios.set({ emptyUserList: true });
    t.open('s09');
    expect(t.controller.stateOf('s09')).toBe('s09.3');
  });

  it('shows the welcome variant only on the first visit (s06.2, s06.1)', () => {
    const t = setup();
    t.controller.switchAccount('taylor');
    t.open('s07');
    expect(t.controller.stateOf('s07')).toBe('s07.2');
    t.open('s07');
    expect(t.controller.stateOf('s07')).toBe('s07.1');
  });
});

describe('GitHub responses', () => {
  const cases = [
    ['cancelled', 's02.4'], ['state', 's02.5'], ['unavailable', 's02.6'], ['no-email', 's02.7'], ['link-unverified', 's02.8'],
  ] as const;
  for (const [response, state] of cases) {
    it(`${response} ends on ${state} with no session`, () => {
      const t = setup();
      t.scenarios.set({ githubResponse: response });
      t.controller.startGithub();
      expect(t.trail.at(-1)).toBe('s05');
      t.controller.githubAuthorize();
      expect(t.controller.stateOf('s05')).toBe('s05.2');
      t.flush();
      expect(t.controller.stateOf('s02')).toBe(state);
      expect(t.backend.sessionState()).toBe('none');
    });
  }

  it('creates a new mentee account, then reuses it (p01)', () => {
    const t = setup();
    t.controller.startGithub();
    t.controller.githubAuthorize();
    t.flush();
    expect(t.state().known?.displayName).toBe('Alex Demo');
    expect(t.trail.at(-1)).toBe('s06');
    expect(t.backend.accounts().filter((account) => account.email === 'alex@devmentor.test')).toHaveLength(1);
  });

  it('links a verified local account without a duplicate (p01, EC5)', () => {
    const t = setup();
    const before = t.backend.accounts().length;
    t.scenarios.set({ githubResponse: 'link-verified' });
    t.controller.startGithub();
    t.controller.githubAuthorize();
    t.flush();
    expect(t.state().known?.displayName).toBe('Nina Demo');
    expect(t.backend.accounts()).toHaveLength(before);
  });

  it('stops a GitHub login without a verified email (s02.7) and a cancelled sign-in (s02.4)', () => {
    const t = setup();
    t.scenarios.set({ githubAccountId: 'jo' });
    t.controller.startGithub();
    t.controller.githubAuthorize();
    t.flush();
    expect(t.controller.stateOf('s02')).toBe('s02.7');
    t.controller.startGithub();
    t.controller.githubCancel();
    expect(t.controller.stateOf('s02')).toBe('s02.4');
  });

  it('reports missing GitHub configuration straight away (p07, s02.6)', () => {
    const t = setup();
    t.scenarios.set({ githubConfigured: false });
    t.controller.startGithub();
    expect(t.trail.at(-1)).toBe('s02');
    expect(t.controller.stateOf('s02')).toBe('s02.6');
    expect(t.state().signInNotice?.detail).toMatch(/not configured/);
  });
});

describe('registration and verification', () => {
  const register = (t: ReturnType<typeof setup>) => {
    t.backend.register({ displayName: 'Pat Demo', email: 'pat@devmentor.test', password: 'wystarczajaco-dlugie-haslo' });
    t.controller.registered('pat@devmentor.test');
  };

  it('verifies with a valid link and signs in (s04.1)', () => {
    const t = setup();
    register(t);
    expect(t.controller.stateOf('s04')).toBe('s04.1');
    t.controller.openVerificationLink();
    expect(t.state().known?.displayName).toBe('Pat Demo');
    expect(t.trail.at(-1)).toBe('s06');
  });

  it('offers a new email after an expired or invalid link (s02.10)', () => {
    const t = setup();
    register(t);
    t.scenarios.set({ verificationLink: 'expired' });
    t.controller.openVerificationLink();
    expect(t.controller.stateOf('s02')).toBe('s02.10');
    expect(t.state().signInNotice?.state).toBe('verification-expired');
    t.scenarios.set({ verificationLink: 'invalid' });
    t.controller.openVerificationLink();
    expect(t.state().signInNotice?.state).toBe('verification-invalid');
    expect(t.backend.sessionState()).toBe('none');
  });

  it('treats a used link as verified without a session (p08)', () => {
    const t = setup();
    register(t);
    t.scenarios.set({ verificationLink: 'reused' });
    t.controller.openVerificationLink();
    expect(t.state().signInNotice?.state).toBe('verified');
    expect(t.backend.sessionState()).toBe('none');
    expect(t.backend.login({ email: 'pat@devmentor.test', password: 'wystarczajaco-dlugie-haslo' }).ok).toBe(true);
  });

  it('resends up to three times, then limits (s04.2, s04.3)', () => {
    const t = setup();
    register(t);
    for (let i = 0; i < 3; i += 1) {
      t.controller.resend();
      expect(t.controller.stateOf('s04')).toBe('s04.2');
    }
    t.controller.resend();
    expect(t.controller.stateOf('s04')).toBe('s04.3');
  });

  it('reports a mail failure and a service failure on resend (s04.4)', () => {
    const t = setup();
    register(t);
    t.scenarios.set({ nextRequest: 'mail-failed' });
    t.controller.resend();
    expect(t.state().resendNotice?.state).toBe('mail-unavailable');
    t.scenarios.set({ nextRequest: 'unavailable' });
    t.controller.resend();
    expect(t.state().resendNotice?.state).toBe('service-unavailable');
    t.scenarios.set({ nextRequest: 'rate-limited' });
    t.controller.resend();
    expect(t.controller.stateOf('s04')).toBe('s04.3');
  });

  it('sends the visitor to registration when there is no pending address', () => {
    const t = setup();
    t.controller.resend();
    expect(t.trail.at(-1)).toBe('s03');
    t.controller.openVerificationLink();
    expect(t.backend.sessionState()).toBe('none');
  });

  it('records form failures as notices and remembers the pending address (s02.12, s03.4 to s03.8)', () => {
    const t = setup();
    t.controller.authFailure('login', { state: 'unverified-email', email: 'pat@devmentor.test' });
    expect(t.controller.stateOf('s02')).toBe('s02.12');
    expect(t.state().pendingEmail).toBe('pat@devmentor.test');
    const expected: Record<string, string> = { 'account-exists': 's03.4', 'github-account': 's03.5', 'rate-limited': 's03.6', 'service-unavailable': 's03.7', 'mail-unavailable': 's03.8' };
    for (const [state, id] of Object.entries(expected)) {
      t.controller.authFailure('register', { state });
      expect(t.controller.stateOf('s03')).toBe(id);
    }
    for (const [state, id] of [['invalid-credentials', 's02.11'], ['rate-limited', 's02.13'], ['service-unavailable', 's02.14']]) {
      t.controller.authFailure('login', { state });
      expect(t.controller.stateOf('s02')).toBe(id);
    }
  });

  it('shows the GitHub-only release (s02.3, s03.9) and fills the registration form (p10, p11)', () => {
    const t = setup();
    t.scenarios.set({ emailEnabled: false });
    expect(t.controller.stateOf('s02')).toBe('s02.3');
    expect(t.controller.stateOf('s03')).toBe('s03.9');
    t.controller.prefillRegister('nina@devmentor.test');
    expect(t.state().registerPrefill).toEqual({ key: 1, email: 'nina@devmentor.test' });
    t.controller.prefillRegister('riley@devmentor.test');
    expect(t.state().registerPrefill?.key).toBe(2);
  });
});

describe('sign-out and reset', () => {
  it('lands on the signed-out home with a live or an expired session (s01.2, p16)', () => {
    const t = setup();
    t.controller.switchAccount('ada');
    t.controller.signOut();
    expect(t.controller.stateOf('s01')).toBe('s01.2');
    t.controller.switchAccount('ada');
    t.controller.expireSession();
    t.controller.signOut();
    expect(t.controller.stateOf('s01')).toBe('s01.2');
    t.open('s02');
    expect(t.controller.stateOf('s01')).toBe('s01.1');
  });

  it('signs out through the account switcher without a message and resets everything', () => {
    const t = setup();
    t.controller.switchAccount('ada');
    t.controller.switchAccount(null);
    expect(t.controller.stateOf('s01')).toBe('s01.1');
    t.controller.switchAccount('alex');
    expect(t.state().known).toBeNull();
    t.scenarios.set({ nextRequest: 'unavailable' });
    t.controller.reset();
    expect(t.scenarios.get().nextRequest).toBe('ok');
    expect(t.state().known).toBeNull();
    expect(t.controller.stateOf('s05')).toBe('s05.1');
    expect(t.controller.stateOf('s99')).toBe('s99');
  });
});

describe('sign-in and registration submit steps', () => {
  it('lets a form open sign-in and registration fresh (s02.1, s03.1)', () => {
    const t = setup();
    t.controller.authFailure('login', { state: 'invalid-credentials' });
    t.controller.openSignIn();
    expect(t.controller.stateOf('s02')).toBe('s02.1');
    t.controller.authFailure('register', { state: 'account-exists' });
    t.controller.openRegister();
    expect(t.controller.stateOf('s03')).toBe('s03.1');
  });
});
