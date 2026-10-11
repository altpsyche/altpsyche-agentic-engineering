// Tests for set-key.sh, the script that saves a TypeSafe key to the main clone's .env. Each case
// builds a real clone with one sibling worktree in a temp dir and pipes the key in on stdin, as a
// run with no terminal does.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { jevEnv } from './env-file.mjs';

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'set-key.sh');

// Git without the caller's config or repo: GIT_DIR from an outer hook (verify.sh runs this test
// inside the real pre-push) cannot redirect these commands, or the script, at the real repo.
// No TYPESAFE_ variable from the owner's shell either, so the script only ever sees the file a test
// sets up.
const ENV = Object.fromEntries(
  Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_') && !k.startsWith('TYPESAFE_')),
);
Object.assign(ENV, { GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' });
const run = (cwd, cmd, args, input = '') => spawnSync(cmd, args, { cwd, env: ENV, input, encoding: 'utf8' });

async function withRepo(fn, { ignored = true } = {}) {
  const dir = await mkdtemp(path.join(tmpdir(), 'jev-set-key-'));
  const main = path.join(dir, 'repo');
  const worktree = path.join(dir, 'repo-7');
  try {
    run(dir, 'git', ['init', '-q', main]);
    if (ignored) await writeFile(path.join(main, '.gitignore'), '.env\n.env.*\n');
    run(main, 'git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'init']);
    run(main, 'git', ['worktree', 'add', '-q', '-b', '7-x', worktree]);
    await fn({ main, worktree });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const setKey = (cwd, input, env = {}) =>
  spawnSync('bash', [SCRIPT], { cwd, env: { ...ENV, ...env }, input, encoding: 'utf8' });

test('run from a worktree, it writes the key to the main clone .env, readable by you only', async () => {
  await withRepo(async ({ main, worktree }) => {
    const result = setKey(worktree, 'sk-123\n');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(await readFile(path.join(main, '.env'), 'utf8'), "TYPESAFE_API_KEY='sk-123'\n");
    assert.equal((await stat(path.join(main, '.env'))).mode & 0o777, 0o600);
    assert.doesNotMatch(result.stdout, /sk-123/);
  });
});

test('it replaces an earlier key and keeps every other line', async () => {
  await withRepo(async ({ main }) => {
    await writeFile(path.join(main, '.env'), 'OTHER=1\nTYPESAFE_API_KEY=old\nexport TYPESAFE_API_KEY=older\nTYPESAFE_BASE_URL=http://x\n');
    assert.equal(setKey(main, 'new\n').status, 0);
    assert.equal(
      await readFile(path.join(main, '.env'), 'utf8'),
      "OTHER=1\nTYPESAFE_BASE_URL=http://x\nTYPESAFE_API_KEY='new'\n",
    );
  });
});

test('an empty answer changes nothing', async () => {
  await withRepo(async ({ main }) => {
    await writeFile(path.join(main, '.env'), 'TYPESAFE_API_KEY=old\n');
    const result = setKey(main, '\n');
    assert.equal(result.status, 0);
    assert.match(result.stdout, /unchanged/);
    assert.equal(await readFile(path.join(main, '.env'), 'utf8'), 'TYPESAFE_API_KEY=old\n');
  });
});

test('it refuses to write where .env is not gitignored', async () => {
  await withRepo(async ({ main }) => {
    const result = setKey(main, 'sk-123\n');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /not gitignored/);
    await assert.rejects(stat(path.join(main, '.env')));
  }, { ignored: false });
});

test('a key with a # or other punctuation reads back whole through jevEnv', async () => {
  await withRepo(async ({ main }) => {
    const key = 'ab#cd"e$f\\n';
    assert.equal(setKey(main, `${key}\n`).status, 0);
    assert.equal(jevEnv({ env: {}, cwd: main }).TYPESAFE_API_KEY, key);
  });
});

test('a key with a single quote is refused, and the file is unchanged', async () => {
  await withRepo(async ({ main }) => {
    await writeFile(path.join(main, '.env'), 'TYPESAFE_API_KEY=old\n');
    const result = setKey(main, "ab'cd\n");
    assert.equal(result.status, 1);
    assert.match(result.stderr, /single quote/);
    assert.equal(await readFile(path.join(main, '.env'), 'utf8'), 'TYPESAFE_API_KEY=old\n');
  });
});

test('it writes to TYPESAFE_ENV_FILE outside any repo, and refuses when it is none', async () => {
  await withRepo(async ({ main }) => {
    const outside = await mkdtemp(path.join(tmpdir(), 'jev-set-key-home-'));
    try {
      const file = path.join(outside, 'typesafe.env');
      assert.equal(setKey(main, 'k1\n', { TYPESAFE_ENV_FILE: file }).status, 0);
      assert.equal(await readFile(file, 'utf8'), "TYPESAFE_API_KEY='k1'\n");
      const none = setKey(main, 'k1\n', { TYPESAFE_ENV_FILE: 'none' });
      assert.equal(none.status, 1);
      assert.match(none.stderr, /no key file in use/);
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });
});
