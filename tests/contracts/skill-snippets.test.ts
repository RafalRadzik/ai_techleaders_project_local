import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const root = process.cwd();
const fixture = resolve(root, `.ai/qa/contract-tests-${process.pid}`);
mkdirSync(fixture, { recursive: true });
afterAll(() => rmSync(fixture, { recursive: true, force: true }));

function document(path: string) {
  // Optional baseline lets the very same regressions exercise pre-fix documents.
  return process.env.SKILL_CONTRACT_BASELINE
    ? execFileSync('git', ['show', `${process.env.SKILL_CONTRACT_BASELINE}:${path}`], { cwd: root, encoding: 'utf8' })
    : readFileSync(resolve(root, path), 'utf8');
}

function blocks(path: string) {
  return [...document(path).matchAll(/```bash\n([\s\S]*?)```/g)].map((match) => match[1]!);
}

function shell(script: string, cwd = fixture, executable = 'bash') {
  return execFileSync(executable, ['-c', script], { cwd, encoding: 'utf8' }).trim();
}

const qa = '.agents/skills/om-qa-buddy/references/';
const trackers = '.agents/skills/om-setup-agent-pipeline/references/trackers/';
const quote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;

describe('QA worktree contracts (actual markdown snippets)', () => {
  it.each(['default', 'relative', 'absolute'])('anchors %s evidence across cd', (kind) => {
    const origin = resolve(fixture, `origin-${kind}`);
    const target = resolve(fixture, `target-${kind}`);
    mkdirSync(resolve(origin, '.ai/browsers'), { recursive: true });
    mkdirSync(target, { recursive: true });
    writeFileSync(resolve(origin, '.ai/browsers/playwright.md'), 'browser');
    const override = kind === 'relative' ? 'custom evidence' : kind === 'absolute' ? resolve(fixture, 'absolute evidence') : '';
    const output = shell(`
      ARTIFACTS_OVERRIDE=${quote(override)}
      ${blocks(`${qa}agentic-setup.md`)[0]}
      printf runbook > "$ARTIFACTS_DIR/runbook"
      printf memory > "$KB_DIR/memory"
      cd ${quote(target)}
      cat "$ARTIFACTS_DIR/runbook" "$KB_DIR/memory" "$BROWSER_FILE"
      printf '\\n%s\\n%s\\n' "$ARTIFACTS_DIR" "$KB_DIR"
    `, origin).split('\n');
    expect(output[0]).toBe('runbookmemorybrowser');
    expect(output[1]).toMatch(/^\//);
    expect(output[1]).toContain(kind === 'default' ? `${origin}/.ai/qa/artifacts_` : kind === 'relative' ? `${origin}/custom evidence` : override);
    expect(output[2]).toBe(`${origin}/.ai/qa/knowledge-base`);
  });

  it('respects absolute configured QA paths', () => {
    const origin = resolve(fixture, 'absolute-config');
    const qaDir = resolve(fixture, 'configured qa');
    mkdirSync(resolve(origin, '.ai'), { recursive: true });
    writeFileSync(resolve(origin, '.ai/agentic.config.json'), JSON.stringify({ paths: { qa: qaDir } }));
    const output = shell(`${blocks(`${qa}agentic-setup.md`)[0]}\nprintf '%s\\n%s' "$ARTIFACTS_DIR" "$KB_DIR"`, origin);
    expect(output.split('\n')[0]).toContain(`${qaDir}/artifacts_`);
    expect(output.split('\n')[1]).toBe(`${qaDir}/knowledge-base`);
  });

  it.each([
    ['0', true, 'true'], ['1', true, 'false'], ['unknown', true, 'false'],
    ['', true, 'false'], ['0', false, 'false'],
  ])('requires current fresh boot %s and repo ownership %s', (reused, owned, expected) => {
    const target = resolve(fixture, `ownership-${reused}-${owned}`);
    mkdirSync(resolve(target, '.ai/test-qa'), { recursive: true });
    writeFileSync(resolve(target, '.ai/agentic.config.json'), JSON.stringify({ paths: { qa: '.ai/test-qa' } }));
    writeFileSync(resolve(target, '.ai/test-qa/test-env.json'), JSON.stringify({ baseUrl: 'http://127.0.0.1:4321', startedByThisRepo: owned }));
    const snippet = blocks(`${qa}worktree-and-env.md`).find((block) => block.includes('BASE_URL='))!;
    const result = shell(`
      ENV_WORKTREE=${quote(target)}
      QA_DIR=.ai/test-qa
      STARTED_BY_THIS_RUN=false
      TEST_ENV_REUSED=${quote(String(reused))}
      ${snippet}
      printf '%s\\n%s' "$STARTED_BY_THIS_RUN" "$ENV_DESCRIPTOR"
    `, target).split('\n');
    expect(result).toEqual([expected, `${target}/.ai/test-qa/test-env.json`]);
  });

  it.each(['0', '1', ''])('retains worktrees until teardown confirmed (%s)', (stopped) => {
    const cleanup = blocks(`${qa}worktree-and-env.md`).find((block) => block.includes('git worktree remove'))!;
    const result = shell(`
      REPO_ROOT=${quote(fixture)}
      WORKTREE_DIR=/owned-worktree
      CREATED_WORKTREE=1
      ENV_STOPPED=${quote(stopped)}
      git() { printf '%s\\n' "$*"; }
      ${cleanup}
    `);
    expect(result.includes('worktree remove --force /owned-worktree')).toBe(stopped === '1');
  });

  it('documents the existing result contract and stop-before-removal context', () => {
    const text = document(`${qa}worktree-and-env.md`);
    expect(text).toContain('TEST_ENV_REUSED=0');
    expect(text).toContain('TEST_ENV_REUSED=1');
    expect(text).toContain('TEST_ENV_REUSED=unknown');
    expect(text).toContain('`$ENV_WORKTREE` and invoke `om-prepare-test-env --stop` there');
    expect(text.indexOf('invoke `om-prepare-test-env --stop`')).toBeLessThan(text.indexOf('git worktree remove'));
    expect(document('.agents/skills/om-prepare-test-env/references/entrypoint-contract.md')).toContain('TEST_ENV_REUSED=1');
  });
});

describe('hybrid tracker shared comment dispatch', () => {
  for (const provider of ['linear', 'jira']) {
    it.each(['get-issue-comment', 'list-issue-comments', 'update-comment'])(`${provider}: %s preserves source routing`, (operation) => {
      const section = document(`${trackers}${provider}.md`).split(`#### ${operation}\n`)[1]!.split(/\n###/)[0]!;
      expect(section).toContain(`**${operation}**`);
      expect(section).toContain('.ai/trackers/github.md');
      expect(section).toContain('repository/PR context');
      expect(section).toMatch(/opaque\s+source\s+comment handle unchanged/);
      expect(section).toContain('native operation below');
      expect(section).toContain(provider === 'linear' ? 'linear ' : 'acli jira ');
    });
  }
});

for (const executable of ['bash', 'zsh']) {
  const available = spawnSync(executable, ['-c', 'exit 0']).status === 0;
  describe.skipIf(!available)(`${executable} pipeline label snippets`, () => {
    for (const path of ['.ai/trackers/github.md', `${trackers}github.md`]) {
      it.each([
        ['false', 'review qa blocked', []],
        ['true', '  review  qa blocked  ', ['remove:review:42', 'remove:blocked:42', 'apply:qa:42']],
        ['true', '', ['apply:qa:42']],
        ['true', 'qa', ['apply:qa:42']],
      ])(`${path}: enabled=%s labels=%s`, (enabled, labels, expected) => {
        const snippet = blocks(path).find((block) => block.includes('set_pipeline_label()'))!;
        const result = shell(`
          ${snippet}
          remove_label() { printf 'remove:%s:%s\\n' "$1" "$2"; }
          apply_label() { printf 'apply:%s:%s\\n' "$1" "$2"; }
          LABELS_ENABLED=${quote(String(enabled))}
          PIPELINE_LABELS=${quote(String(labels))}
          set_pipeline_label 42 qa
        `, fixture, executable);
        expect(result ? result.split('\n') : []).toEqual(expected);
      });
    }
  });
}
