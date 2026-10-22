import { useEffect, useRef, type ReactNode } from 'react';
import { Home, ShieldCheck, Users, UserRound } from 'lucide-react';
import { AccountForm, AuthFeedback, Badge, Button, Card } from '@devmentor/ui';
import { AppShell, AuthLayout, DataTable, EmptyState, ErrorMessage, LoadingMessage } from '@devmentor/ui/backend';
import { DEMO_ACCOUNTS, homeFor, loginSchema, registerSchema, REGISTER_ENDPOINT, SCREEN_ROLE, SIGN_IN_ENDPOINT, type DemoUser, type Role } from './model';
import { PREFILL_PASSWORD, type Notice, type PageState } from './controller';
import { navigate } from './navigation';
import { usePrototype } from './store';

type ScreenProps = { id: string; title: string; description: string; refs: string[]; children: ReactNode; note?: ReactNode };

/** Screen section the review engine understands: one per map ID, never renamed. */
export function Screen({ id, title, description, refs, children, note }: ScreenProps) {
  const { controller } = usePrototype();
  return <section className="screen" id={id} aria-label={title}>
    <div className="screen-meta"><h2>{title}</h2><p>{description}</p>
      <div className="screen-refs">{refs.map((ref) => <span className="ref" key={ref}>{ref}</span>)}<span className="ref" data-state>State {controller.stateOf(id)}</span></div>
    </div>
    <div className="frame">{children}</div>
    {note && <div className="notes"><div className="note">{note}</div></div>}
  </section>;
}

/** Shows a controller notice and moves focus to it when a new one arrives. */
function Feedback({ notice, actions }: { notice: Notice | null; actions?: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const stamp = notice?.stamp;
  useEffect(() => {
    const alert = box.current?.querySelector<HTMLElement>('.dm-auth-feedback');
    if (!alert || !alert.offsetParent) return;
    alert.setAttribute('tabindex', '-1');
    alert.focus({ preventScroll: true });
  }, [stamp]);
  if (!notice) return null;
  return <div ref={box}><AuthFeedback state={notice.state} detail={notice.detail} actions={actions} /></div>;
}

/** Reviewer note under a screen: story numbers, what is simulated, what the prototype does not settle. */
function Note({ stories, simulated, open }: { stories: string; simulated: string; open: string }) {
  return <>
    <p><strong>Stories:</strong> {stories}</p>
    <p><strong>Simulated:</strong> {simulated}</p>
    <p><strong>Not settled here:</strong> {open}</p>
  </>;
}

const ROLE_LABEL: Record<Role, string> = { mentee: 'Mentee', mentor: 'Mentor', operator: 'Operator' };
const SCREEN_NOTE = 'Prototype: nothing you type is stored or sent anywhere. Use fictional data.';

/** Workspace navigation. GAP D1: no nav-item component, so these are plain links in the `nav` slot. */
function WorkspaceNav({ user, current }: { user: DemoUser; current: string }) {
  const link = (id: string, label: string, icon: ReactNode) =>
    <a key={id} href={`#${id}`} aria-current={current === id ? 'page' : undefined}>{icon}{label}</a>;
  return <>
    {user.roles.includes('operator') && <>{link('s08', 'Admin home', <ShieldCheck aria-hidden="true" />)}{link('s09', 'Users', <Users aria-hidden="true" />)}</>}
    {user.roles.includes('mentor') && link('s07', 'Mentor home', <UserRound aria-hidden="true" />)}
    {user.roles.includes('mentee') && link('s06', 'Home', <Home aria-hidden="true" />)}
  </>;
}

/** GAP D2: no `WorkflowAction` component, so sign-out is a plain `Button` in the `actions` slot. */
function Workspace({ user, current, children }: { user: DemoUser; current: string; children: ReactNode }) {
  const { controller } = usePrototype();
  return <AppShell user={{ displayName: user.displayName }} nav={<WorkspaceNav user={user} current={current} />}
    actions={<Button size="sm" intent="neutral" appearance="stroke" onClick={() => controller.signOut()}>Sign out</Button>}>
    {children}
  </AppShell>;
}

/** GAP D6: no home-page composition in the design system; built from `Card` and `EmptyState`. */
function HomeBody({ homeId, user, first }: { homeId: string; user: DemoUser; first: boolean }) {
  const greeting = `${first ? 'Welcome' : 'Hello'}, ${user.displayName}`;
  if (homeId === 's08') {
    return <div className="dm-product-stack">
      <header><span className="dm-product-eyebrow">Operator</span><h1 className="dm-product-heading">{greeting}</h1></header>
      <Card className="dm-product-panel">
        <h2 className="dm-product-title">Users</h2>
        <p className="dm-product-muted">See every account and its roles.</p>
        <div className="dm-product-actions"><Button onClick={() => navigate('s09')}>Open users</Button></div>
      </Card>
    </div>;
  }
  return <div className="dm-product-stack">
    <header><span className="dm-product-eyebrow">{homeId === 's07' ? 'Mentor' : 'Mentee'}</span><h1 className="dm-product-heading">{greeting}</h1></header>
    <EmptyState title={homeId === 's07' ? 'Nothing here yet' : 'No sessions yet'} />
  </div>;
}

/**
 * A page behind the guard. The open page shows what it last learned from the server;
 * the access check runs on every visit, so a stale page can still be refused.
 */
function Guarded({ id, children }: { id: string; children: (user: DemoUser, page: PageState) => ReactNode }) {
  const { state, controller } = usePrototype();
  const user = state.known;
  const page = state.pages[id];
  const allowed = !!user && user.roles.includes(SCREEN_ROLE[id]);
  // The engine focuses the heading on arrival, but this page has none while it checks the session.
  const phase = page?.phase;
  useEffect(() => {
    if (phase !== 'ready' && phase !== 'error') return;
    const frame = document.querySelector<HTMLElement>(`#${id}.is-current .frame`);
    const target = frame?.querySelector<HTMLElement>('h1') ?? frame?.querySelector<HTMLElement>('[role="alert"]');
    if (!target) return;
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }, [phase, id]);
  if (!page) {
    return allowed
      ? <Workspace user={user} current={id}>{children(user, { phase: 'ready', first: false })}</Workspace>
      : <div className="dm-product-stack proto-gate"><EmptyState title="Not loaded yet" description="Open this screen to run its access check." /></div>;
  }
  if (page.phase === 'checking') {
    return id === 's09' && allowed
      ? <Workspace user={user} current={id}>{children(user, page)}</Workspace>
      : <div className="proto-gate"><LoadingMessage message="Checking your session…" /></div>;
  }
  if (page.phase === 'error') {
    return id === 's09' && allowed
      ? <Workspace user={user} current={id}>{children(user, page)}</Workspace>
      : <div className="proto-gate"><ErrorMessage message="We could not load this page. Try again." action={<Button size="sm" intent="neutral" appearance="stroke" onClick={() => controller.retryPage(id)}>Try again</Button>} /></div>;
  }
  return allowed ? <Workspace user={user} current={id}>{children(user, page)}</Workspace> : null;
}

function AuthFooter({ back = 's01' }: { back?: string }) {
  return <div className="dm-product-stack">
    <p className="dm-product-caption">{SCREEN_NOTE}</p>
    <Button size="sm" intent="neutral" appearance="ghost" onClick={() => navigate(back)}>{back === 's01' ? 'Back to home' : 'Back to registration'}</Button>
  </div>;
}

export function Screens() {
  const { state, controller, backend, scenarios } = usePrototype();
  const sc = scenarios.get();
  const user = state.known;
  const sendAnother = <Button size="sm" intent="neutral" appearance="stroke" onClick={() => controller.resend()}>Send another email</Button>;

  const signInActions = (n: Notice) => {
    if (n.state === 'unverified-email' || n.state === 'verification-expired' || n.state === 'verification-invalid') return sendAnother;
    if (n.state === 'github-link' && state.pendingEmail) return sendAnother;
    if (n.state === 'github-state') return <Button size="sm" intent="neutral" appearance="stroke" onClick={() => controller.startGithub()}>Try GitHub again</Button>;
    return undefined;
  };
  const registerActions = (n: Notice) => {
    if (n.state === 'account-exists') return <Button size="sm" intent="neutral" appearance="stroke" onClick={() => controller.openSignIn()}>Sign in</Button>;
    if (n.state === 'github-account') return <Button size="sm" intent="neutral" appearance="stroke" onClick={() => controller.startGithub()}>Continue with GitHub</Button>;
    if (n.state === 'mail-unavailable') return <Button size="sm" intent="neutral" appearance="stroke" onClick={() => document.querySelector<HTMLFormElement>('#s03 form')?.requestSubmit()}>Try again</Button>;
    return undefined;
  };
  const homeTarget = user ? homeFor(user.roles) : 's02';
  const prefill = state.registerPrefill;
  const githubAccount = DEMO_ACCOUNTS.find((account) => account.id === sc.githubAccountId)!;

  return <>
    <Screen id="s01" title="Home" description="Public start page. Signing out lands here." refs={['E01', '#20']}
      note={<Note stories="no acceptance criterion; it is where signing out lands (spec, Sign out, EC27)." simulated="nothing on this screen." open="what the public home page contains and whether a signed-in visitor is redirected (L14)." />}>
      <div className="proto-public">
        <header className="proto-public-header">
          <span className="proto-wordmark">DevMentor</span>
          <Button intent="neutral" appearance="stroke" onClick={() => (user ? navigate(homeTarget) : controller.openSignIn())}>{user ? 'Open my home' : 'Sign in'}</Button>
        </header>
        <main className="proto-public-main dm-product-stack">
          {state.signedOut && <AuthFeedback state="signed-out" />}
          <header><h1 className="dm-product-heading proto-hero">Text mentoring for developers</h1></header>
          <p className="dm-fact-chips" role="group" aria-label="Session format"><Badge variant="secondary">Text sessions</Badge><Badge variant="secondary">25 minutes</Badge><Badge variant="secondary">50 minutes</Badge></p>
          <div className="dm-product-actions"><Button onClick={() => (user ? navigate(homeTarget) : controller.openSignIn())}>{user ? 'Open my home' : 'Sign in'}</Button></div>
        </main>
      </div>
    </Screen>

    <Screen id="s02" title="Sign in" description="GitHub first, email and password second." refs={['E01', '#20', '#21']}
      note={<Note stories="#20 (K1 to K6), #21 (K2); #22 (K6) through the return target." simulated="GitHub, the email and password check, the rate limit and the service failure. Nothing is sent anywhere." open="the button label (the spec says Sign in with GitHub, the design system says Continue with GitHub, L24); how the page learns that a session expired (L09); no password reset (L19)." />}>
      <AuthLayout title="Sign in" description={state.signInReason ?? 'Continue with GitHub, or use your email address.'} footer={<AuthFooter />}>
        <AccountForm mode="sign-in" schema={loginSchema} endpoint={SIGN_IN_ENDPOINT} emailDisabled={!sc.emailEnabled}
          notice={<Feedback notice={state.signInNotice} actions={state.signInNotice ? signInActions(state.signInNotice) : undefined} />}
          onSuccess={(data) => controller.loggedIn((data as { user: DemoUser }).user)}
          onGitHub={() => controller.startGithub()} onSwitchMode={() => controller.openRegister()} />
      </AuthLayout>
    </Screen>

    <Screen id="s03" title="Register" description="Create an account with email. GitHub stays first." refs={['E01', '#21']}
      note={<Note stories="#21 (K1, K3), #20 (K5)." simulated="account creation, the conflict checks and the mail failure." open="the 72 limit counts bytes in the prototype (L27); what a failed email leaves behind (L12); the spec describes only /sign-in, so /register copies its rules (L18)." />}>
      <AuthLayout title="Create an account" description="Use GitHub, or register with your email address." footer={<AuthFooter />}>
        <AccountForm key={`register-${prefill?.key ?? 0}`} mode="register" schema={registerSchema} endpoint={REGISTER_ENDPOINT} emailDisabled={!sc.emailEnabled}
          initialValues={prefill ? { displayName: 'Demo Person', email: prefill.email, password: PREFILL_PASSWORD } : undefined}
          notice={<Feedback notice={state.registerNotice} actions={state.registerNotice ? registerActions(state.registerNotice) : undefined} />}
          onSuccess={(data) => controller.registered((data as { email: string }).email)}
          onGitHub={() => controller.startGithub()} onSwitchMode={() => controller.openSignIn()} />
      </AuthLayout>
    </Screen>

    <Screen id="s04" title="Check your inbox" description="Registration creates no session until the email link is opened." refs={['E01', '#21']}
      note={<Note stories="#21 (K1)." simulated="the email: the card stands in for the mail client and no message exists. The link result is chosen in the review bar (p08)." open="how a new link is requested and the 3 per hour limit (L05); a 24 hour link lifetime is an assumption (L06, L22)." />}>
      <AuthLayout title="Verify your email" description="We need to confirm this address before you can sign in." footer={<AuthFooter back="s03" />}>
        <div className="dm-product-stack">
          {state.resendNotice
            ? <Feedback notice={state.resendNotice} />
            : <AuthFeedback state="check-inbox" detail={state.pendingEmail ?? 'Register first to receive a verification link.'} />}
          {state.pendingEmail
            ? <>
                <Card className="dm-product-panel">
                  <span className="dm-product-eyebrow">Simulated email, no message was sent</span>
                  <h2 className="dm-product-title">Verify your DevMentor email</h2>
                  <p className="dm-product-muted">To: {state.pendingEmail}</p>
                  <div className="dm-product-actions"><Button onClick={() => controller.openVerificationLink()}>Open verification link</Button></div>
                </Card>
                <div className="dm-product-actions">{sendAnother}</div>
              </>
            : <Button onClick={() => controller.openRegister()}>Go to registration</Button>}
        </div>
      </AuthLayout>
    </Screen>

    <Screen id="s05" title="GitHub (simulation)" description="Stands in for github.com. Not part of the product." refs={['E01', '#20']}
      note={<Note stories="#20 (K1 to K3)." simulated="the whole screen. It stands in for github.com and is not a product screen. The 10 second timeout is shortened." open="nothing about the real OAuth exchange, state check or token handling." />}>
      <AuthLayout title="Authorize DevMentor" description="This page simulates GitHub. Your real GitHub account is not contacted." footer={<p className="dm-product-caption">The GitHub response is chosen in the review bar.</p>}>
        <div className="dm-product-stack">
          <Card className="dm-product-panel">
            <span className="dm-product-eyebrow">Signing in as</span>
            <h2 className="dm-product-title">{githubAccount.displayName}</h2>
            <p className="dm-product-muted">GitHub login: {githubAccount.githubLogin}</p>
          </Card>
          {state.githubWaiting && <LoadingMessage message={sc.githubResponse === 'unavailable' ? 'Waiting for GitHub… (the demo shortens the 10 second limit)' : 'Waiting for GitHub…'} />}
          <div className="dm-product-actions">
            <Button intent="neutral" appearance="ghost" disabled={state.githubWaiting} onClick={() => controller.githubCancel()}>Cancel</Button>
            <Button disabled={state.githubWaiting} onClick={() => controller.githubAuthorize()}>Authorize DevMentor</Button>
          </div>
        </div>
      </AuthLayout>
    </Screen>

    <Screen id="s06" title="Mentee home" description="Home for accounts with the mentee role." refs={['E01', '#20', '#21', '#22']}
      note={<Note stories="#20 (K1, K4), #21 (K1), #22 (K5)." simulated="the session check (a short delay) and the expiry." open="what a home contains in this epic (L13). There is no way to become a mentor and no text about invitations, on purpose (R07, L32)." />}>
      <Guarded id="s06">{(account, page) => <HomeBody homeId="s06" user={account} first={page.first} />}</Guarded>
    </Screen>

    <Screen id="s07" title="Mentor home" description="Home for accounts with the mentor role." refs={['E01', '#20', '#22']}
      note={<Note stories="#20 (K2, K4), #22 (K1)." simulated="the session check and the role check." open="mentor accounts already exist: accepting an invitation, and #21 K4, belong to another epic (L01)." />}>
      <Guarded id="s07">{(account, page) => <HomeBody homeId="s07" user={account} first={page.first} />}</Guarded>
    </Screen>

    <Screen id="s08" title="Operator home" description="Home for operators. Mentor and operator accounts land here." refs={['E01', '#20', '#22']}
      note={<Note stories="#20 (K4, K7), #22 (K3, K6)." simulated="the operator allowlist (Sam can be revoked and restored from the review bar)." open="there is no screen that grants roles, by design (L03)." />}>
      <Guarded id="s08">{(account, page) => <HomeBody homeId="s08" user={account} first={page.first} />}</Guarded>
    </Screen>

    <Screen id="s09" title="Users" description="Operator-only list of accounts." refs={['E01', '#22']}
      note={<Note stories="#22 (K6, K7), #20 (K4)." simulated="the list: it shows the demo accounts that exist right now, so it grows after a registration." open="columns, personal data shown and paging are assumptions (L16)." />}>
      <Guarded id="s09">{(_account, page) =>
        <div className="dm-product-stack">
          <header><h1 className="dm-product-heading">Users</h1></header>
          <DataTable caption="Users" getRowId={(row) => row.id} loading={page.phase === 'checking'}
            error={page.phase === 'error' ? 'We could not load users. Try again.' : null} onRetry={() => controller.retryPage('s09')}
            emptyMessage="No users yet"
            rows={sc.emptyUserList ? [] : backend.accounts().filter((account) => account.exists)}
            columns={[
              { key: 'displayName', header: 'Display name' },
              { key: 'email', header: 'Email' },
              { key: 'roles', header: 'Roles', render: (row) => <span className="dm-fact-chips">{row.roles.map((role) => <Badge key={role} variant="secondary">{ROLE_LABEL[role]}</Badge>)}</span> },
            ]} />
        </div>}
      </Guarded>
    </Screen>

    <Screen id="s10" title="No access" description="A wrong role lands on the account's own home with this message. It is a message, not a route." refs={['E01', '#22']}
      note={<Note stories="#22 (K1, K2, K6)." simulated="the redirect: the real app sends the person to their own home." open="whether the message is a screen at all (L10). The prototype keeps the ID s10 so comments stay attached." />}>
      {user
        ? <Workspace user={user} current="s10">
            <div className="dm-product-stack">
              <AuthFeedback state={state.denied} />
              <HomeBody homeId={homeFor(user.roles)} user={user} first={false} />
            </div>
          </Workspace>
        : <div className="dm-product-stack proto-gate"><EmptyState title="Sign in to continue" description="This message appears after a signed-in account opens a page for another role." action={<Button onClick={() => controller.openSignIn()}>Sign in</Button>} /></div>}
    </Screen>
  </>;
}
