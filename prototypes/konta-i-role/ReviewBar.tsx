import { useState, type ReactNode } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Badge, Button } from '@devmentor/ui';
import { DEMO_ACCOUNTS, TIME_ZONE, DEMO_PASSWORD } from './model';
import type { GithubResponse, NextRequest, VerificationLink } from './scenario';
import { navigate, SCREENS } from './navigation';
import { usePrototype } from './store';

function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly (readonly [T, string])[]; onChange: (value: T) => void }) {
  return <label className="dm-field">{label}
    <select className="dm-input" value={value} onChange={(event) => onChange(event.target.value as T)}>
      {options.map(([id, text]) => <option key={id} value={id}>{text}</option>)}
    </select>
  </label>;
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return <fieldset className="proto-scenario-group"><legend>{title}</legend>{children}</fieldset>;
}

const GITHUB_RESPONSES: readonly (readonly [GithubResponse, string])[] = [
  ['success', 'Authorized (new or existing account)'],
  ['link-verified', 'Authorized, email matches a verified account (links it)'],
  ['cancelled', 'User cancelled'],
  ['state', 'State mismatch or expired'],
  ['unavailable', 'GitHub error or timeout'],
  ['no-email', 'No verified primary email'],
  ['link-unverified', 'Email matches an unverified account'],
];
const NEXT_REQUESTS: readonly (readonly [NextRequest, string])[] = [
  ['ok', 'Works normally'],
  ['unavailable', 'Service unavailable (503)'],
  ['rate-limited', 'Too many requests (429)'],
  ['mail-failed', 'Email could not be sent'],
  ['database', 'Database unavailable'],
];
const LINKS: readonly (readonly [VerificationLink, string])[] = [
  ['valid', 'Valid'], ['expired', 'Expired'], ['invalid', 'Invalid'], ['reused', 'Already used'],
];

/** Scenario controls live here, apart from product navigation (rule 5). Ids p01 to p19 follow the screen map. */
function ScenarioPanel() {
  const { controller, backend, scenarios, state } = usePrototype();
  const sc = scenarios.get();
  const existing = backend.accounts().filter((account) => account.exists);
  const session = backend.sessionState();
  const sam = backend.accounts().find((account) => account.id === 'sam')!;
  const samOperator = sam.roles.includes('operator');
  const now = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: TIME_ZONE }).format(scenarios.now());
  return <aside id="scenario-panel" className="proto-scenarios" aria-label="Scenario controls">
    <p className="dm-product-caption">Controls for the person reviewing the prototype. They are not part of the product. All data is fictional and held in memory; reload resets it. A failure chosen under &quot;Next request&quot; applies once.</p>
    <div className="proto-scenario-grid">
      <Group title="GitHub">
        <Choice label="GitHub demo account (p01)" value={sc.githubAccountId} onChange={(githubAccountId) => scenarios.set({ githubAccountId })}
          options={DEMO_ACCOUNTS.filter((account) => account.githubLogin).map((account) => [account.id, `${account.displayName}: ${account.note}`] as const)} />
        <Choice label="GitHub response (p01 to p06)" value={sc.githubResponse} onChange={(githubResponse) => scenarios.set({ githubResponse })} options={GITHUB_RESPONSES} />
        <Choice label="GitHub setup (p07)" value={sc.githubConfigured ? 'yes' : 'no'} onChange={(value) => scenarios.set({ githubConfigured: value === 'yes' })} options={[['yes', 'Configured'], ['no', 'Not configured']]} />
      </Group>
      <Group title="Forms and requests">
        <Choice label="Next request (p09)" value={sc.nextRequest} onChange={(nextRequest) => scenarios.set({ nextRequest })} options={NEXT_REQUESTS} />
        <Choice label="Release (p10)" value={sc.emailEnabled ? 'both' : 'github'} onChange={(value) => scenarios.set({ emailEnabled: value === 'both' })} options={[['both', 'GitHub and email'], ['github', 'GitHub only']]} />
        <Choice label="Verification link (p08)" value={sc.verificationLink} onChange={(verificationLink) => scenarios.set({ verificationLink })} options={LINKS} />
        <div className="proto-scenario-buttons" role="group" aria-label="Fill registration (p11)">
          <span className="dm-product-caption">Fill registration with an address that (p11)</span>
          <Button size="sm" intent="neutral" appearance="stroke" onClick={() => controller.prefillRegister('nina@devmentor.test')}>has a password</Button>
          <Button size="sm" intent="neutral" appearance="stroke" onClick={() => controller.prefillRegister('riley@devmentor.test')}>uses GitHub</Button>
          <Button size="sm" intent="neutral" appearance="stroke" onClick={() => controller.prefillRegister('pat@devmentor.test')}>is not verified</Button>
        </div>
      </Group>
      <Group title="Session and accounts">
        <p className="dm-product-caption">Demo time: {now} ({TIME_ZONE}). Session: {session === 'none' ? 'none' : session === 'active' ? `active, ${state.known?.displayName ?? 'signed in'}` : 'expired'}.</p>
        <Choice label="Switch demo account (p14)" value={state.known?.id ?? ''} onChange={(id) => controller.switchAccount(id || null)}
          options={[['', 'Signed out'], ...existing.map((account) => [account.id, `${account.displayName}: ${account.roles.join(', ')}`] as const)]} />
        <Choice label="Return target after a guard redirect (p15)" value={sc.returnTo} onChange={(returnTo) => scenarios.set({ returnTo })} options={[['valid', 'The page that was opened'], ['hostile', '//evil.example']]} />
        <div className="proto-scenario-buttons">
          <Button size="sm" intent="neutral" appearance="stroke" disabled={session !== 'active'} onClick={() => controller.expireSession()}>Expire session now (p12)</Button>
          <Button size="sm" intent="neutral" appearance="stroke" onClick={() => controller.advanceClock()}>Advance clock 24 h (p18)</Button>
          <Button size="sm" intent="neutral" appearance="stroke" onClick={() => navigate('s02')}>Open /sign-in (p17)</Button>
        </div>
        <p className="dm-product-caption">Signing out with an expired session works like signing out with a live one (p16): expire it, then use Sign out.</p>
        <div className="proto-scenario-buttons" role="group" aria-label="Operator access for Sam (p13)">
          <span className="dm-product-caption">Sam&apos;s operator access (p13)</span>
          <Button size="sm" intent="neutral" appearance="stroke" disabled={!samOperator} onClick={() => controller.setOperatorAccess(false)}>Revoke</Button>
          <Button size="sm" intent="neutral" appearance="stroke" disabled={samOperator} onClick={() => controller.setOperatorAccess(true)}>Restore</Button>
        </div>
        <Choice label="Users list (p19, added by the build)" value={sc.emptyUserList ? 'empty' : 'users'} onChange={(value) => scenarios.set({ emptyUserList: value === 'empty' })} options={[['users', 'With users'], ['empty', 'Empty']]} />
      </Group>
    </div>
    <details className="proto-scenario-details"><summary>Demo accounts and password</summary>
      <p>Password for email accounts: <code>{DEMO_PASSWORD}</code></p>
      <ul>{DEMO_ACCOUNTS.map((account) => <li key={account.id}><strong>{account.email}</strong> <span>{account.note}</span></li>)}</ul>
    </details>
    <div className="dm-product-actions"><Button size="sm" intent="neutral" appearance="stroke" onClick={() => controller.reset()}>Reset simulation</Button></div>
  </aside>;
}

export function ReviewBar({ dark, onToggleTheme }: { dark: boolean; onToggleTheme: () => void }) {
  const { state } = usePrototype();
  const [scenarios, setScenarios] = useState(false);
  const [map, setMap] = useState(false);
  const toggleMap = () => { document.body.classList.toggle('proto-map-open', !map); setMap(!map); };
  return <>
    <header className="doc-toolbar">
      <div className="proto-review-brand"><strong>DevMentor</strong><Badge variant="information">Prototype</Badge></div>
      <label className="proto-screen-select"><span className="sr-only">Screen</span>
        <select value={state.screen} onChange={(event) => navigate(event.target.value)}>
          {SCREENS.map(([id, title]) => <option key={id} value={id}>{id}: {title}</option>)}
        </select>
      </label>
      <button type="button" className="btn btn-outline btn-sm" aria-expanded={scenarios} aria-controls="scenario-panel" onClick={() => setScenarios(!scenarios)}>Scenarios</button>
      <button type="button" className="btn btn-outline btn-sm" aria-pressed={map} onClick={toggleMap}>Screen map</button>
      <button id="theme-toggle" type="button" className="btn btn-outline btn-sm" aria-label={dark ? 'Use light theme' : 'Use dark theme'} onClick={onToggleTheme}>{dark ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}</button>
      <nav className="screen-nav" aria-label="Screen map">
        {SCREENS.map(([id, title]) => <a key={id} href={`#${id}`} aria-current={state.screen === id ? 'page' : undefined}>{id} {title}</a>)}
      </nav>
    </header>
    {scenarios && <ScenarioPanel />}
  </>;
}
