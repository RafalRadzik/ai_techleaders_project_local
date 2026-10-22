import type { Backend } from './backend';
import { homeFor, SCREEN_ROLE, type DemoUser } from './model';
import type { Scenarios } from './scenario';

export type FeedbackState =
  | 'invalid-credentials' | 'unverified-email' | 'github-account' | 'account-exists' | 'github-cancelled' | 'github-state'
  | 'github-unavailable' | 'github-email' | 'github-link' | 'rate-limited' | 'service-unavailable' | 'mail-unavailable'
  | 'session-expired' | 'signed-out' | 'verification-expired' | 'verification-invalid' | 'verified' | 'check-inbox';
export type Notice = { state: FeedbackState; detail?: string; stamp: number };
export type PageState = { phase: 'checking' | 'ready' | 'error'; first: boolean };

export type CtlState = {
  screen: string;
  /** The account as the open page last learned it from the server. Can be stale until the next request. */
  known: DemoUser | null;
  pages: Record<string, PageState>;
  signInNotice: Notice | null;
  signInReason: string | null;
  registerNotice: Notice | null;
  returnTo: string | null;
  signedOut: boolean;
  denied: 'forbidden' | 'operator-revoked';
  deniedFrom: string | null;
  pendingEmail: string | null;
  resends: number;
  resendNotice: Notice | null;
  githubWaiting: boolean;
  registerPrefill: { key: number; email: string } | null;
};

export const CHECK_MS = 500;
export const GITHUB_MS = 400;
export const GITHUB_TIMEOUT_MS = 2500;
export const MAX_RESENDS = 3;
export const DAY_MS = 24 * 60 * 60 * 1000;
export const PREFILL_PASSWORD = 'wystarczajaco-dlugie-haslo';

const PAGE_LABEL: Record<string, string> = { s06: 'the mentee home', s07: 'the mentor home', s08: 'the operator home', s09: 'the Users page' };

/** Only known guarded screens are valid return targets (spec EC22); anything else falls back to the role home. */
export function safeReturnTo(target: string | null, user: DemoUser): string {
  return target && SCREEN_ROLE[target] && user.roles.includes(SCREEN_ROLE[target]) ? target : homeFor(user.roles);
}

type Deps = {
  backend: Backend;
  scenarios: Scenarios;
  navigate: (screenId: string) => void;
  schedule?: (fn: () => void, ms: number) => unknown;
};

const initial = (screen: string): CtlState => ({
  screen, known: null, pages: {}, signInNotice: null, signInReason: null, registerNotice: null, returnTo: null,
  signedOut: false, denied: 'forbidden', deniedFrom: null, pendingEmail: null, resends: 0, resendNotice: null,
  githubWaiting: false, registerPrefill: null,
});

/**
 * Everything the screens do between each other: guards, redirects, notices and the
 * scenario outcomes. Framework free so the navigation tests can drive it directly.
 */
export function createController({ backend, scenarios, navigate, schedule = (fn, ms) => window.setTimeout(fn, ms) }: Deps) {
  let s: CtlState = initial('s01');
  let version = 0;
  let stamp = 0;
  const listeners = new Set<() => void>();
  const tokens: Record<string, number> = {};
  const welcomed = new Set<string>();
  const emit = () => { version += 1; listeners.forEach((listener) => listener()); };
  const notice = (state: FeedbackState, detail?: string): Notice => ({ state, detail, stamp: (stamp += 1) });

  function toSignIn(next: { notice?: Notice | null; reason?: string | null }) {
    s.signInNotice = next.notice ?? null;
    s.signInReason = next.reason ?? null;
    s.githubWaiting = false;
    navigate('s02');
  }

  function guardRedirect(id: string, next: { notice?: Notice; reason?: string }) {
    s.returnTo = scenarios.get().returnTo === 'hostile' ? '//evil.example' : id;
    delete s.pages[id];
    toSignIn(next);
  }

  function checkPage(id: string) {
    const token = (tokens[id] = (tokens[id] ?? 0) + 1);
    s.pages[id] = { phase: 'checking', first: false };
    emit();
    schedule(() => {
      if (s.screen !== id || tokens[id] !== token) return;
      const session = backend.sessionState();
      if (session === 'none') {
        s.known = null;
        // GAP: no feedback state for "sign in to continue" (s02.16); the reason goes into the layout description.
        guardRedirect(id, { reason: `Sign in to open ${PAGE_LABEL[id]}.` });
        return;
      }
      if (session === 'expired') {
        backend.endSession();
        s.known = null;
        guardRedirect(id, { notice: notice('session-expired') });
        return;
      }
      const user = backend.user()!;
      const required = SCREEN_ROLE[id];
      // GAP D4/D7: the refusal is an `AuthFeedback` banner above the account's own home, not a separate route (L10).
      if (!user.roles.includes(required)) {
        s.known = user;
        s.denied = required === 'operator' && backend.wasRevokedOperator(user.id) ? 'operator-revoked' : 'forbidden';
        s.deniedFrom = id;
        delete s.pages[id];
        navigate('s10');
        return;
      }
      if (scenarios.consumeNext(['unavailable', 'database']) !== 'ok') {
        s.pages[id] = { phase: 'error', first: false };
        emit();
        return;
      }
      const key = `${user.id}:${id}`;
      const first = !welcomed.has(key);
      welcomed.add(key);
      s.known = user;
      s.pages[id] = { phase: 'ready', first };
      emit();
    }, CHECK_MS);
  }

  function signedIn(user: DemoUser) {
    s.known = user;
    s.signInNotice = null;
    s.signInReason = null;
    s.registerNotice = null;
    s.signedOut = false;
    const target = safeReturnTo(s.returnTo, user);
    s.returnTo = null;
    navigate(target);
  }

  function githubResult(response: ReturnType<Scenarios['get']>['githubResponse']) {
    const failures = { cancelled: 'github-cancelled', state: 'github-state', unavailable: 'github-unavailable', 'no-email': 'github-email', 'link-unverified': 'github-link' } as const;
    if (response === 'link-verified') {
      const linked = backend.linkGithub('nina@devmentor.test', 'nina-gh');
      if (linked.ok) { signedIn(linked.data.user); return; }
      toSignIn({ notice: notice('github-link') });
      return;
    }
    if (response !== 'success') { toSignIn({ notice: notice(failures[response]) }); return; }
    const result = backend.github(scenarios.get().githubAccountId);
    if (result.ok) signedIn(result.data.user);
    else toSignIn({ notice: notice((result.error.state as FeedbackState) ?? 'github-unavailable') });
  }

  const api = {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    version: () => version,
    get state() { return s; },

    /** Called by the review engine whenever a screen becomes current. */
    enter(id: string) {
      s.screen = id;
      if (id !== 's01') s.signedOut = false;
      if ((id === 's02' || id === 's03') && backend.user()) {
        emit();
        navigate(homeFor(backend.user()!.roles));
        return;
      }
      if (SCREEN_ROLE[id]) { checkPage(id); return; }
      emit();
    },

    openSignIn() { s.returnTo = null; toSignIn({}); },
    openRegister() { s.registerNotice = null; navigate('s03'); },
    prefillRegister(email: string) {
      s.registerNotice = null;
      s.registerPrefill = { key: (s.registerPrefill?.key ?? 0) + 1, email };
      navigate('s03');
    },

    startGithub() {
      if (!scenarios.get().githubConfigured) {
        // GAP L08: the design system has no `method-unavailable` state, so this reuses `github-unavailable` with a detail line.
        toSignIn({ notice: notice('github-unavailable', 'GitHub sign-in is not configured yet.') });
        return;
      }
      navigate('s05');
    },
    githubCancel() { toSignIn({ notice: notice('github-cancelled') }); },
    githubAuthorize() {
      if (s.githubWaiting) return;
      const response = scenarios.get().githubResponse;
      s.githubWaiting = true;
      emit();
      schedule(() => { s.githubWaiting = false; githubResult(response); }, response === 'unavailable' ? GITHUB_TIMEOUT_MS : GITHUB_MS);
    },

    /** Form results the simulated server could not accept (the form keeps what was typed). */
    authFailure(form: 'login' | 'register', error: { state?: string; detail?: string; email?: string }) {
      const state = (error.state ?? 'service-unavailable') as FeedbackState;
      if (error.email) s.pendingEmail = error.email;
      if (form === 'login') { s.signInNotice = notice(state, error.detail); s.signInReason = null; }
      else s.registerNotice = notice(state, error.detail);
      emit();
    },
    loggedIn(user: DemoUser) { signedIn(user); },
    registered(email: string) {
      s.pendingEmail = email;
      s.resends = 0;
      s.resendNotice = null;
      s.registerNotice = null;
      navigate('s04');
    },

    openVerificationLink() {
      const email = s.pendingEmail;
      if (!email) return;
      const link = scenarios.get().verificationLink;
      if (link === 'expired' || link === 'invalid') { toSignIn({ notice: notice(link === 'expired' ? 'verification-expired' : 'verification-invalid') }); return; }
      const result = backend.verify(email, link === 'valid');
      s.pendingEmail = null;
      s.resendNotice = null;
      if (result.ok && result.data.user) signedIn(result.data.user);
      else toSignIn({ notice: notice('verified') });
    },
    resend() {
      const email = s.pendingEmail;
      if (!email) { navigate('s03'); return; }
      if (s.resends >= MAX_RESENDS) {
        s.resendNotice = notice('rate-limited', 'You can request another email in about an hour.');
      } else {
        const failure = scenarios.consumeNext(['rate-limited', 'mail-failed', 'unavailable', 'database']);
        if (failure === 'rate-limited') s.resendNotice = notice('rate-limited', 'You can request another email in about an hour.');
        else if (failure === 'mail-failed') s.resendNotice = notice('mail-unavailable');
        else if (failure !== 'ok') s.resendNotice = notice('service-unavailable');
        // GAP D5: no "sent again" state in `AuthFeedback`; `check-inbox` with a detail line stands in.
        else { s.resends += 1; s.resendNotice = notice('check-inbox', `Another email was sent to ${email}.`); }
      }
      s.signInNotice = null;
      navigate('s04');
      emit();
    },

    signOut() {
      backend.logout();
      s.known = null;
      s.pages = {};
      s.signedOut = true;
      navigate('s01');
    },
    retryPage(id: string) { checkPage(id); },

    switchAccount(id: string | null) {
      backend.logout();
      s.pages = {};
      s.signedOut = false;
      if (id === null) { s.known = null; navigate('s01'); return; }
      const result = backend.signInAs(id);
      if (!result.ok) return;
      s.known = result.data.user;
      navigate(homeFor(result.data.user.roles));
    },
    expireSession() { backend.expire(); emit(); },
    advanceClock() { scenarios.set({ clockOffsetMs: scenarios.get().clockOffsetMs + DAY_MS }); },
    setOperatorAccess(enabled: boolean) {
      backend.setOperator('sam', enabled);
      if (enabled && backend.user()?.id === 'sam') navigate('s08');
    },
    reset() {
      backend.reset();
      scenarios.reset();
      welcomed.clear();
      s = initial(s.screen);
      navigate('s01');
    },

    /** Visible state ID from lekcja-07/mapa-ekranow.md for the screen as it looks right now. */
    stateOf(id: string): string {
      const page = s.pages[id];
      const sc = scenarios.get();
      const byNotice: Record<string, string> = {
        'github-cancelled': '4', 'github-state': '5', 'github-unavailable': '6', 'github-email': '7', 'github-link': '8',
        'session-expired': '9', 'verification-expired': '10', 'verification-invalid': '10', 'invalid-credentials': '11',
        'unverified-email': '12', 'rate-limited': '13', 'service-unavailable': '14',
      };
      switch (id) {
        case 's01': return s.signedOut ? 's01.2' : 's01.1';
        case 's02':
          if (s.signInNotice && byNotice[s.signInNotice.state]) return `s02.${byNotice[s.signInNotice.state]}`;
          if (s.signInReason) return 's02.16';
          return sc.emailEnabled ? 's02.1' : 's02.3';
        case 's03': {
          const map: Record<string, string> = { 'account-exists': '4', 'github-account': '5', 'rate-limited': '6', 'service-unavailable': '7', 'mail-unavailable': '8' };
          if (s.registerNotice && map[s.registerNotice.state]) return `s03.${map[s.registerNotice.state]}`;
          return sc.emailEnabled ? 's03.1' : 's03.9';
        }
        case 's04': {
          const state = s.resendNotice?.state;
          if (state === 'check-inbox') return 's04.2';
          if (state === 'rate-limited') return 's04.3';
          return state ? 's04.4' : 's04.1';
        }
        case 's05': return s.githubWaiting ? 's05.2' : 's05.1';
        case 's06': case 's07':
          return `${id}.${page?.phase === 'checking' ? 3 : page?.phase === 'error' ? 7 : page?.first ? 2 : 1}`;
        case 's08': return `s08.${page?.phase === 'checking' ? 2 : page?.phase === 'error' ? 8 : 1}`;
        case 's09': return `s09.${page?.phase === 'checking' ? 2 : page?.phase === 'error' ? 4 : sc.emptyUserList ? 3 : 1}`;
        case 's10':
          if (s.denied === 'operator-revoked') return 's10.3';
          return s.deniedFrom === 's08' || s.deniedFrom === 's09' ? 's10.2' : 's10.1';
        default: return id;
      }
    },
  };
  return api;
}

export type Controller = ReturnType<typeof createController>;
