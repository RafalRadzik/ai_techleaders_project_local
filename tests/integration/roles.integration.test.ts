import { resolve } from 'node:path';
import { describe, expect, inject, it } from 'vitest';
import {
  captureBrowserFailure,
  closeAgentBrowser,
  currentPath,
  integrationArtifactsDirectory,
  runAgentBrowser,
  sessionCookieHeader,
  signInAs,
} from './agent-browser';
import { expectAbsent, parseSnapshot, subtreeOf } from './assertions';

/** Any wording of a self-service path to the mentor role, which R07 forbids. */
const BECOME_A_MENTOR = /become a mentor|apply to mentor|mentor application|apply as a mentor/i;
const WORKSPACE_NAV = { role: 'navigation', name: 'Workspace navigation' } as const;

let sequence = 0;

/** A fresh, isolated agent-browser session per scenario, closed in `finally`. */
async function inBrowser(
  label: string,
  scenario: (session: string, baseUrl: string) => Promise<void>,
): Promise<void> {
  const baseUrl = inject('integrationBaseUrl');
  sequence += 1;
  const session = `devmentor-roles-${label}-${process.pid}-${sequence}`;
  try {
    await scenario(session, baseUrl);
  } catch (error) {
    await captureBrowserFailure(session, `roles-${label}`);
    throw error;
  } finally {
    await closeAgentBrowser(session);
  }
}

async function screenshot(session: string, name: string): Promise<void> {
  await runAgentBrowser(
    session,
    'screenshot',
    resolve(integrationArtifactsDirectory, `${name}.png`),
    '--full',
  );
}

/** Open `path` and wait until `text` has rendered; returns where the browser ended up. */
async function openAndWait(
  session: string,
  baseUrl: string,
  path: string,
  text: string,
): Promise<string> {
  await runAgentBrowser(session, 'open', `${baseUrl}${path}`);
  await runAgentBrowser(session, 'wait', '--text', text);
  return currentPath(session);
}

/** Link names inside the workspace navigation landmark, in DOM order. */
function workspaceNavLinks(snapshot: string): string[] {
  const nav = subtreeOf(parseSnapshot(snapshot), WORKSPACE_NAV);
  if (!nav) throw new Error(`No workspace navigation in the snapshot:\n${snapshot}`);
  return nav.filter((node) => node.role === 'link').map((node) => node.name);
}

/** R07: neither the navigation nor anything else on the page offers the mentor role. */
function expectNoBecomeAMentorPath(snapshot: string): void {
  expectAbsent(snapshot, { text: BECOME_A_MENTOR, within: { ...WORKSPACE_NAV, mustContain: 'link' } });
  expectAbsent(snapshot, { text: BECOME_A_MENTOR });
}

async function getUsers(
  baseUrl: string,
  headers: Record<string, string> = {},
): Promise<{ status: number; payload: unknown }> {
  const response = await fetch(`${baseUrl}/api/users`, { headers });
  return { status: response.status, payload: await response.json() };
}

describe('TC-ROLES-000 expectAbsent refuses to pass vacuously', () => {
  const nav = [
    '- banner',
    '  - navigation "Workspace navigation" [ref=e1]',
    '    - link "Home" [ref=e2]',
    '- main',
    '  - link "Become a mentor" [ref=e3]',
  ].join('\n');

  it('passes when the scoped tree exists and lacks the pattern', () => {
    expect(() =>
      expectAbsent(nav, { text: BECOME_A_MENTOR, within: { ...WORKSPACE_NAV, mustContain: 'link' } }),
    ).not.toThrow();
  });

  it('fails when the pattern is present, scoped or page-wide', () => {
    expect(() => expectAbsent(nav, { role: 'link', text: BECOME_A_MENTOR })).toThrow(
      /found 1 match/,
    );
    expect(() =>
      expectAbsent(nav.replace('link "Home"', 'link "Apply to mentor"'), {
        text: BECOME_A_MENTOR,
        within: WORKSPACE_NAV,
      }),
    ).toThrow(/found 1 match/);
  });

  it('fails against a missing, empty, or link-less tree', () => {
    expect(() => expectAbsent('', { text: BECOME_A_MENTOR })).toThrow(/vacuously/);
    expect(() =>
      expectAbsent('- main\n  - heading "Sign in" [level=1, ref=e1]', {
        text: BECOME_A_MENTOR,
        within: WORKSPACE_NAV,
      }),
    ).toThrow(/vacuously/);
    expect(() =>
      expectAbsent('- navigation "Workspace navigation" [ref=e1]\n- main', {
        text: BECOME_A_MENTOR,
        within: WORKSPACE_NAV,
      }),
    ).toThrow(/vacuously/);
    expect(() =>
      expectAbsent('- navigation "Workspace navigation" [ref=e1]\n  - StaticText "Menu"', {
        text: BECOME_A_MENTOR,
        within: { ...WORKSPACE_NAV, mustContain: 'link' },
      }),
    ).toThrow(/vacuously/);
  });
});

describe('TC-ROLES-001 role guards on signed-in screens (#14)', () => {
  it('sends a mentee who opens a mentor or operator screen to their home (edge case 19)', async () => {
    await inBrowser('mentee-guard', async (session, baseUrl) => {
      const { landingPath } = await signInAs(session, baseUrl, 'mock-mentee');
      expect(landingPath).toBe('/home');

      for (const forbidden of ['/mentor', '/admin', '/admin/users']) {
        expect(await openAndWait(session, baseUrl, forbidden, 'Welcome, Mock Mentee')).toBe(
          '/home',
        );
        const snapshot = await runAgentBrowser(session, 'snapshot');
        expect(snapshot).toContain('heading "Welcome, Mock Mentee"');
        expectAbsent(snapshot, { role: 'heading', text: /Welcome, Mock Mentor|Dashboard|^Users$/ });
        expectAbsent(snapshot, { text: 'Ada Lovelace' });
      }
      await screenshot(session, 'roles-mentee-refused-mentor');
    });
  });

  it('refuses a mentor-only user on operator screens (edge case 20)', async () => {
    await inBrowser('mentor-guard', async (session, baseUrl) => {
      const { landingPath } = await signInAs(session, baseUrl, 'mock-mentor');
      expect(landingPath).toBe('/mentor');

      for (const forbidden of ['/admin', '/admin/users']) {
        expect(await openAndWait(session, baseUrl, forbidden, 'Welcome, Mock Mentor')).toBe(
          '/mentor',
        );
        const snapshot = await runAgentBrowser(session, 'snapshot');
        expect(snapshot).toContain('heading "Welcome, Mock Mentor"');
        expectAbsent(snapshot, { role: 'heading', text: /Dashboard|^Users$/ });
        expectAbsent(snapshot, { role: 'link', text: /Operator home|^Users$/ });
        expectAbsent(snapshot, { text: 'Ada Lovelace' });
      }
      await screenshot(session, 'roles-mentor-refused-admin');
    });
  });
});

describe('TC-ROLES-002 no self-service path to the mentor role (R07)', () => {
  const surfaces = {
    Home: { href: '/home', ready: 'Welcome, Mock Mentee' },
    'Mentor workspace': { href: '/mentor', ready: 'Welcome, Mock' },
    'Operator home': { href: '/admin', ready: 'Connected' },
    Users: { href: '/admin/users', ready: 'Ada Lovelace' },
  } as const;
  type Surface = keyof typeof surfaces;

  const personas: { login: string; home: string; links: Surface[] }[] = [
    { login: 'mock-mentee', home: '/home', links: ['Home'] },
    { login: 'mock-mentor', home: '/mentor', links: ['Mentor workspace'] },
    { login: 'mock-operator', home: '/admin', links: ['Mentor workspace', 'Operator home', 'Users'] },
  ];

  for (const persona of personas) {
    it(`offers ${persona.login} no "become a mentor" affordance on any surface it can open`, async () => {
      await inBrowser(`r07-${persona.login}`, async (session, baseUrl) => {
        const { landingPath } = await signInAs(session, baseUrl, persona.login);
        expect(landingPath).toBe(persona.home);

        // Visit every surface through its own navigation link, so the nav is exercised too.
        for (const label of persona.links) {
          const { href, ready } = surfaces[label];
          await runAgentBrowser(session, 'find', 'role', 'link', 'click', '--name', label);
          await runAgentBrowser(session, 'wait', '--url', `**${href}`);
          await runAgentBrowser(session, 'wait', '--text', ready);
          expect(await currentPath(session)).toBe(href);

          const snapshot = await runAgentBrowser(session, 'snapshot');
          // The precondition the negative assertion depends on: a real, populated nav.
          expect(workspaceNavLinks(snapshot)).toEqual(persona.links);
          expectNoBecomeAMentorPath(snapshot);
          await screenshot(session, `roles-r07-${persona.login}-${href.slice(1).replace(/\//g, '-')}`);
        }
      });
    });
  }
});

describe('TC-ROLES-003 user listing is operator-only (#14)', () => {
  it('shows the operator the users list', async () => {
    await inBrowser('operator-users', async (session, baseUrl) => {
      const { landingPath } = await signInAs(session, baseUrl, 'mock-operator');
      expect(landingPath).toBe('/admin');

      expect(await openAndWait(session, baseUrl, '/admin/users', 'Ada Lovelace')).toBe(
        '/admin/users',
      );
      const users = await runAgentBrowser(session, 'snapshot');
      expect(users).toContain('heading "Users"');
      expect(users).toContain('cell "Ada Lovelace"');
      expect(users).toContain('cell "mock-mentee@devmentor.test"');
      expect(workspaceNavLinks(users)).toContain('Users');
      await screenshot(session, 'roles-operator-users');
    });
  });

  it('answers 403 to a mentee and a mentor, and 401 to an anonymous caller, on /api/users', async () => {
    const baseUrl = inject('integrationBaseUrl');
    const cookies = new Map<string, string>();
    for (const login of ['mock-mentee', 'mock-mentor', 'mock-operator']) {
      await inBrowser(`api-${login}`, async (session) => {
        cookies.set(login, (await signInAs(session, baseUrl, login)).sessionCookie);
      });
    }
    const cookieOf = (login: string): string => {
      const cookie = cookies.get(login);
      if (!cookie) throw new Error(`No session cookie captured for ${login}`);
      return cookie;
    };

    for (const login of ['mock-mentee', 'mock-mentor']) {
      const refused = await getUsers(baseUrl, sessionCookieHeader(cookieOf(login)));
      expect(refused.status).toBe(403);
      expect(refused.payload).toMatchObject({ ok: false, error: { code: 'forbidden' } });
      expect(refused.payload).not.toHaveProperty('data');
    }

    const anonymous = await getUsers(baseUrl);
    expect(anonymous.status).toBe(401);
    expect(anonymous.payload).toMatchObject({ ok: false, error: { code: 'unauthorized' } });

    // The same request succeeds for the operator, so the refusals above are about the role.
    const admitted = await getUsers(baseUrl, sessionCookieHeader(cookieOf('mock-operator')));
    expect(admitted.status).toBe(200);
    expect(admitted.payload).toMatchObject({ ok: true });
  });
});
