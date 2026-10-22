import { delay, http, HttpResponse } from 'msw';
import { createBackend } from './backend';
import { createController } from './controller';
import { loginSchema, registerSchema, REGISTER_ENDPOINT, SIGN_IN_ENDPOINT, type ApiResponse } from './model';
import { navigate } from './navigation';
import { createScenarios } from './scenario';

/** One in-memory accounts service for the whole visit. Reloading the page resets it. */
export const scenarios = createScenarios();
export const backend = createBackend(scenarios.now);
export const controller = createController({ backend, scenarios, navigate });

const statusByCode: Record<string, number> = { unauthorized: 401, forbidden: 403, conflict: 409, validation_failed: 422, rate_limited: 429, service_unavailable: 503 };

function respond(result: ApiResponse<unknown>) {
  return HttpResponse.json(result, { status: result.ok ? 200 : statusByCode[result.error.code] ?? 500 });
}

function validationFailure(issues: { path: PropertyKey[]; message: string }[]): ApiResponse<never> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of issues) (fieldErrors[String(issue.path[0])] ??= []).push(issue.message);
  return { ok: false, error: { code: 'validation_failed', message: 'Check the highlighted fields.', fieldErrors } };
}

const failure = (code: string, state: string, detail?: string, email?: string): ApiResponse<never> =>
  ({ ok: false, error: { code, message: '', state, detail, email } });

/**
 * Simulated answers for the account forms. A failure carries an empty message on purpose:
 * the screen shows it as `AuthFeedback` (via the controller) instead of the form's inline text.
 */
function answer(form: 'login' | 'register', result: ApiResponse<unknown>) {
  if (!result.ok && result.error.state) controller.authFailure(form, result.error);
  return respond(result);
}

export const authHandlers = [
  http.post(SIGN_IN_ENDPOINT, async ({ request }) => {
    const parsed = loginSchema.safeParse(await request.json());
    await delay(700);
    if (!parsed.success) return respond(validationFailure(parsed.error.issues));
    const next = scenarios.consumeNext(['rate-limited', 'unavailable', 'database']);
    // GAP D3: `AuthFeedback` has no countdown, so the wait goes into its `detail` slot (L11). The prototype counts nothing.
    if (next === 'rate-limited') return answer('login', failure('rate_limited', 'rate-limited', 'Try again in 15 minutes.'));
    if (next !== 'ok') return answer('login', failure('service_unavailable', 'service-unavailable'));
    return answer('login', backend.login(parsed.data));
  }),
  http.post(REGISTER_ENDPOINT, async ({ request }) => {
    const parsed = registerSchema.safeParse(await request.json());
    await delay(700);
    if (!parsed.success) return respond(validationFailure(parsed.error.issues));
    const next = scenarios.consumeNext(['rate-limited', 'unavailable', 'database', 'mail-failed']);
    if (next === 'rate-limited') return answer('register', failure('rate_limited', 'rate-limited', 'Try again in 1 hour.'));
    if (next === 'unavailable' || next === 'database') return answer('register', failure('service_unavailable', 'service-unavailable'));
    const result = backend.register(parsed.data);
    if (!result.ok) return answer('register', result);
    // The account row exists but the message never left: registration is not a success (spec EC29, L12).
    if (next === 'mail-failed') return answer('register', failure('service_unavailable', 'mail-unavailable', undefined, parsed.data.email));
    return respond(result);
  }),
];
