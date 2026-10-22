import { DEMO_DEFAULT_NOW } from './model';

export type GithubResponse = 'success' | 'link-verified' | 'cancelled' | 'state' | 'unavailable' | 'no-email' | 'link-unverified';
export type VerificationLink = 'valid' | 'expired' | 'invalid' | 'reused';
export type NextRequest = 'ok' | 'unavailable' | 'rate-limited' | 'mail-failed' | 'database';

/** Review-bar settings. They shape the simulated server's answers and are not product state. */
export type ScenarioState = {
  githubAccountId: string;
  githubResponse: GithubResponse;
  githubConfigured: boolean;
  verificationLink: VerificationLink;
  nextRequest: NextRequest;
  emailEnabled: boolean;
  returnTo: 'valid' | 'hostile';
  emptyUserList: boolean;
  clockOffsetMs: number;
};

export const DEFAULT_SCENARIO: ScenarioState = {
  githubAccountId: 'alex',
  githubResponse: 'success',
  githubConfigured: true,
  verificationLink: 'valid',
  nextRequest: 'ok',
  emailEnabled: true,
  returnTo: 'valid',
  emptyUserList: false,
  clockOffsetMs: 0,
};

export function createScenarios() {
  let state: ScenarioState = { ...DEFAULT_SCENARIO };
  let version = 0;
  const listeners = new Set<() => void>();
  const emit = () => { version += 1; listeners.forEach((listener) => listener()); };
  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    version: () => version,
    get: () => state,
    set(patch: Partial<ScenarioState>) { state = { ...state, ...patch }; emit(); },
    /** Demo "now": a fixed instant plus whatever the reviewer advanced the clock by. */
    now: () => DEMO_DEFAULT_NOW + state.clockOffsetMs,
    /** The chosen failure applies to one request. Returns it and resets the control, or 'ok' when this request is not affected. */
    consumeNext(applicable: readonly NextRequest[]): NextRequest {
      if (!applicable.includes(state.nextRequest)) return 'ok';
      const chosen = state.nextRequest;
      state = { ...state, nextRequest: 'ok' };
      emit();
      return chosen;
    },
    reset() { state = { ...DEFAULT_SCENARIO }; emit(); },
  };
}

export type Scenarios = ReturnType<typeof createScenarios>;
