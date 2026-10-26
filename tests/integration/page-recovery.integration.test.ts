import { execFile, spawn, type ChildProcess } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { connect, createServer, type Server, type Socket } from 'node:net';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { expect, it } from 'vitest';
import {
  captureBrowserFailure,
  closeAgentBrowser,
  currentPath,
  integrationArtifactsDirectory,
  runAgentBrowser,
} from './agent-browser';
import { integrationChildEnvironment } from './environment';

const execFileAsync = promisify(execFile);

async function listen(server: Server): Promise<number> {
  await new Promise<void>((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No isolated TCP port allocated');
  return address.port;
}

async function closeServer(server: Server): Promise<void> {
  if (!server.listening) return;
  await new Promise<void>((resolveClose, reject) => {
    server.close((error) => error ? reject(error) : resolveClose());
  });
}

async function stopApp(app: ChildProcess | undefined): Promise<void> {
  if (!app || app.pid === undefined || app.exitCode !== null || app.signalCode !== null) return;
  const exited = new Promise<void>((resolveExit) => app.once('exit', () => resolveExit()));
  app.kill('SIGTERM');
  const timer = setTimeout(() => app.kill('SIGKILL'), 5_000);
  try {
    await exited;
  } finally {
    clearTimeout(timer);
  }
}

it('recovers a guarded page after its isolated database becomes available without granting access', async () => {
  const runId = `page-recovery-${process.pid}-${Date.now()}`;
  const session = `devmentor-${runId}`;
  const logPath = resolve(integrationArtifactsDirectory, `${runId}-app.log`);
  const sockets = new Set<Socket>();
  let forwarding = false;
  let postgres: StartedPostgreSqlContainer | undefined;
  let app: ChildProcess | undefined;
  let startupError: Error | undefined;
  const proxy = createServer((client) => {
    sockets.add(client);
    client.once('close', () => sockets.delete(client));
    if (!forwarding || !postgres) {
      client.destroy();
      return;
    }
    const upstream = connect(postgres.getPort(), postgres.getHost());
    sockets.add(upstream);
    upstream.once('close', () => sockets.delete(upstream));
    upstream.on('error', () => client.destroy());
    client.on('error', () => upstream.destroy());
    client.once('close', () => upstream.destroy());
    upstream.once('close', () => client.destroy());
    client.pipe(upstream).pipe(client);
  });
  await mkdir(integrationArtifactsDirectory, { recursive: true });
  const log = createWriteStream(logPath);

  try {
    postgres = await new PostgreSqlContainer('postgres:17-alpine')
      .withDatabase('devmentor_page_recovery')
      .withUsername('devmentor')
      .withPassword('devmentor')
      .start();
    const proxyPort = await listen(proxy);
    const portReservation = createServer();
    const appPort = await listen(portReservation);
    await closeServer(portReservation);
    const baseUrl = `http://127.0.0.1:${appPort}`;
    const databaseUrl = new URL(postgres.getConnectionUri());
    const migrationEnvironment = integrationChildEnvironment(databaseUrl.toString(), baseUrl);
    await execFileAsync(
      process.platform === 'win32' ? 'npm.cmd' : 'npm',
      ['run', 'db:migrate'],
      { cwd: process.cwd(), env: migrationEnvironment, timeout: 180_000, maxBuffer: 20 * 1024 * 1024 },
    );
    databaseUrl.hostname = '127.0.0.1';
    databaseUrl.port = String(proxyPort);
    const environment = {
      ...migrationEnvironment,
      DATABASE_URL: databaseUrl.toString(),
    };

    // Start Next directly so this test owns exactly the PID it terminates.
    // The normal integration setup has already built .next; do not rebuild it here.
    app = spawn(
      process.execPath,
      [resolve('node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(appPort)],
      { cwd: resolve('packages/app'), env: environment, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    app.once('error', (error) => { startupError = error; });
    app.stdout?.pipe(log, { end: false });
    app.stderr?.pipe(log, { end: false });
    await expect.poll(async () => {
      if (startupError) throw startupError;
      if (app?.exitCode !== null || app?.signalCode !== null) {
        throw new Error('Isolated Next server exited before readiness');
      }
      try {
        // The public landing page does not open a database scope.
        return (await fetch(baseUrl, { signal: AbortSignal.timeout(1_000) })).ok;
      } catch {
        return false;
      }
    }, { timeout: 30_000 }).toBe(true);

    await runAgentBrowser(session, 'open', `${baseUrl}/home`);
    await runAgentBrowser(session, 'wait', '--text', 'Page unavailable');
    const unavailable = await runAgentBrowser(session, 'snapshot');
    expect(unavailable).toContain('heading "Page unavailable"');
    expect(unavailable).toMatch(/alert[\s\S]*We couldn't load this page/);
    expect(unavailable).toContain('button "Try again"');
    expect(unavailable).not.toMatch(/Welcome|Sign out|Workspace navigation|password|ECONN|postgres/i);
    expect(await currentPath(session)).toBe('/home');
    await runAgentBrowser(
      session, 'screenshot', resolve(integrationArtifactsDirectory, `${runId}-unavailable.png`), '--full',
    );
    await expect.poll(() => readFile(logPath, 'utf8')).toMatch(/Page session lookup failed/);

    forwarding = true;
    await runAgentBrowser(session, 'find', 'role', 'button', 'click', '--name', 'Try again');
    await runAgentBrowser(session, 'wait', '--text', 'Sign in with GitHub');
    expect(await currentPath(session)).toBe('/sign-in?returnTo=%2Fhome');
    const recovered = await runAgentBrowser(session, 'snapshot');
    expect(recovered).toContain('heading "Sign in"');
    expect(recovered).not.toMatch(/Page unavailable|Welcome|Sign out|Workspace navigation/);
    await runAgentBrowser(
      session, 'screenshot', resolve(integrationArtifactsDirectory, `${runId}-recovered.png`), '--full',
    );
  } catch (error) {
    await captureBrowserFailure(session, runId);
    throw error;
  } finally {
    try {
      await closeAgentBrowser(session);
    } finally {
      try {
        await stopApp(app);
      } finally {
        log.end();
        for (const socket of sockets) socket.destroy();
        try {
          await closeServer(proxy);
        } finally {
          await postgres?.stop();
        }
      }
    }
  }
}, 240_000);
