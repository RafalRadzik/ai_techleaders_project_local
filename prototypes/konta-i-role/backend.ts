import { DEMO_ACCOUNTS, DEMO_DEFAULT_NOW, SESSION_TTL_MS, type ApiResponse, type DemoAccount, type DemoUser, type Role } from './model';

export type SessionState = 'none' | 'expired' | 'active';

const toUser = (account: DemoAccount): DemoUser => ({ id: account.id, displayName: account.displayName, email: account.email, roles: [...account.roles] });
const clone = () => DEMO_ACCOUNTS.map((account) => ({ ...account, roles: [...account.roles] }));

/**
 * In-memory stand-in for the accounts service. No cookies, hashing, e-mail or OAuth:
 * it only produces the visible outcomes the screens need.
 */
export function createBackend(now: () => number = () => DEMO_DEFAULT_NOW) {
  let accounts: DemoAccount[] = clone();
  let session: { userId: string; expiresAt: number } | null = null;
  const revokedOperators = new Set<string>();
  const listeners = new Set<() => void>();
  let version = 0;
  const emit = () => { version += 1; listeners.forEach((listener) => listener()); };
  const byId = (id: string) => accounts.find((account) => account.id === id);
  const byEmail = (email: string) => accounts.find((account) => account.exists && account.email === email);
  const open = (account: DemoAccount) => { session = { userId: account.id, expiresAt: now() + SESSION_TTL_MS }; emit(); return toUser(account); };

  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    version: () => version,
    accounts: () => accounts,
    sessionState(): SessionState {
      if (!session) return 'none';
      return session.expiresAt > now() ? 'active' : 'expired';
    },
    /** The signed-in account with its roles as they are on the server right now. */
    user(): DemoUser | null {
      const account = session && byId(session.userId);
      return account && this.sessionState() === 'active' ? toUser(account) : null;
    },
    /** Sign in with email and password. Failures look the same, except an unverified account with the right password (spec EC13, EC15). */
    login(input: { email: string; password: string }): ApiResponse<{ user: DemoUser }> {
      const account = byEmail(input.email);
      if (account && account.password !== null && account.password === input.password && !account.verified) {
        return { ok: false, error: { code: 'forbidden', message: '', state: 'unverified-email', email: account.email } };
      }
      if (!account || account.password === null || account.password !== input.password) {
        return { ok: false, error: { code: 'unauthorized', message: '', state: 'invalid-credentials' } };
      }
      return { ok: true, data: { user: open(account) } };
    },
    /** Registration creates an unverified account and no session. */
    register(input: { displayName: string; email: string; password: string }): ApiResponse<{ email: string }> {
      const existing = byEmail(input.email);
      if (existing?.verified && existing.password !== null) {
        return { ok: false, error: { code: 'conflict', message: '', state: 'account-exists' } };
      }
      if (existing?.verified) {
        return { ok: false, error: { code: 'conflict', message: '', state: 'github-account' } };
      }
      // A new address takes the demo row of the same email (Pat) or becomes a fresh row.
      let pending = existing ?? accounts.find((account) => !account.exists && account.email === input.email);
      if (!pending) {
        pending = { id: `new-${accounts.length}`, displayName: input.displayName, email: input.email, roles: ['mentee'], githubLogin: null, githubEmailVerified: true, password: null, verified: false, exists: true, note: 'registered in this visit' };
        accounts.push(pending);
      }
      Object.assign(pending, { displayName: input.displayName, password: input.password, verified: false, exists: true });
      emit();
      return { ok: true, data: { email: input.email } };
    },
    /** Marks the address verified. Opening the link while signing in creates the session. */
    verify(email: string, signIn: boolean): ApiResponse<{ user: DemoUser | null }> {
      const account = byEmail(email);
      if (!account) return { ok: false, error: { code: 'not_found', message: '', state: 'verification-invalid' } };
      account.verified = true;
      if (!signIn) { emit(); return { ok: true, data: { user: null } }; }
      return { ok: true, data: { user: open(account) } };
    },
    /** GitHub authorised for a demo account. First sign-in creates the account with the mentee role. */
    github(accountId: string): ApiResponse<{ user: DemoUser; created: boolean }> {
      const account = byId(accountId);
      if (!account || !account.githubLogin) return { ok: false, error: { code: 'not_found', message: '', state: 'github-unavailable' } };
      if (!account.githubEmailVerified) return { ok: false, error: { code: 'forbidden', message: '', state: 'github-email' } };
      const created = !account.exists;
      account.exists = true;
      account.verified = true;
      return { ok: true, data: { user: open(account), created } };
    },
    /** GitHub email matches a verified local account: connect it and sign in, no duplicate row (spec EC5). */
    linkGithub(email: string, login: string): ApiResponse<{ user: DemoUser }> {
      const account = byEmail(email);
      if (!account || !account.verified) return { ok: false, error: { code: 'not_found', message: '', state: 'github-link' } };
      account.githubLogin = login;
      return { ok: true, data: { user: open(account) } };
    },
    logout() { session = null; emit(); },
    /** Scenario p12: the cookie is past its lifetime, but the browser still shows the page. */
    expire() { if (session) { session.expiresAt = now() - 1; emit(); } },
    /** Drops an expired session the way the server does on the next request. */
    endSession() { session = null; emit(); },
    /** Scenario p13: the operator allowlist changes while the session stays open. */
    setOperator(id: string, enabled: boolean) {
      const account = byId(id);
      if (!account) return;
      const roles: Role[] = account.roles.filter((role) => role !== 'operator');
      account.roles = enabled ? [...roles, 'operator'] : roles;
      if (enabled) revokedOperators.delete(id); else revokedOperators.add(id);
      emit();
    },
    wasRevokedOperator: (id: string) => revokedOperators.has(id),
    /** Review shortcut (scenario p14): sign in as an existing demo account without a login step. */
    signInAs(id: string): ApiResponse<{ user: DemoUser }> {
      const account = byId(id);
      if (!account || !account.exists) return { ok: false, error: { code: 'not_found', message: 'This demo account does not exist yet' } };
      return { ok: true, data: { user: open(account) } };
    },
    reset() {
      accounts = clone();
      session = null;
      revokedOperators.clear();
      emit();
    },
  };
}

export type Backend = ReturnType<typeof createBackend>;
