import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { envFilePath, jevEnv } from './env-file.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

// Git with no caller config, and no GIT_DIR from an outer hook (verify.sh runs inside the real
// pre-push), so it cannot touch the real repo or its .env. No TYPESAFE_ variable from the owner's
// shell either, so a test only ever has the key it sets.
const GIT_ENV = Object.fromEntries(
  Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_') && !k.startsWith('TYPESAFE_')),
);
Object.assign(GIT_ENV, { GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' });
const git = (cwd, ...args) => execFileSync('git', args, { cwd, env: GIT_ENV, stdio: 'ignore' });

// A main clone with one commit and one sibling worktree, the layout docs/workflow.md works in.
async function withRepo(fn) {
  const dir = await mkdtemp(path.join(tmpdir(), 'jev-env-'));
  const main = path.join(dir, 'repo');
  const worktree = path.join(dir, 'repo-7');
  try {
    execFileSync('git', ['init', '-q', main], { env: GIT_ENV });
    git(main, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'init');
    git(main, 'worktree', 'add', '-q', '-b', '7-x', worktree);
    await fn({ dir, main, worktree });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('with no key in the environment, the key comes from the main clone .env', async () => {
  await withRepo(async ({ main }) => {
    await writeFile(path.join(main, '.env'), 'TYPESAFE_API_KEY=from-file\n');
    assert.equal(jevEnv({ env: {}, cwd: main }).TYPESAFE_API_KEY, 'from-file');
  });
});

test('from a worktree, the key comes from the main clone .env, not the worktree', async () => {
  await withRepo(async ({ main, worktree }) => {
    await writeFile(path.join(main, '.env'), 'TYPESAFE_API_KEY=from-main\n');
    assert.equal(jevEnv({ env: {}, cwd: worktree }).TYPESAFE_API_KEY, 'from-main');
  });
});

test('from a subdirectory of the clone, the key still comes from the clone root', async () => {
  await withRepo(async ({ main }) => {
    await writeFile(path.join(main, '.env'), 'TYPESAFE_API_KEY=from-file\n');
    await mkdir(path.join(main, 'a/b'), { recursive: true });
    assert.equal(jevEnv({ env: {}, cwd: path.join(main, 'a/b') }).TYPESAFE_API_KEY, 'from-file');
  });
});

test('a value already in the environment wins over the file', async () => {
  await withRepo(async ({ main }) => {
    await writeFile(path.join(main, '.env'), 'TYPESAFE_API_KEY=from-file\nTYPESAFE_BASE_URL=http://file\n');
    const env = jevEnv({ env: { TYPESAFE_API_KEY: 'from-shell' }, cwd: main });
    assert.equal(env.TYPESAFE_API_KEY, 'from-shell');
    assert.equal(env.TYPESAFE_BASE_URL, 'http://file');
  });
});

test('only TYPESAFE_ variables are taken from the file', async () => {
  await withRepo(async ({ main }) => {
    await writeFile(path.join(main, '.env'), 'OTHER_SECRET=x\nTYPESAFE_API_KEY=k\n# a comment\n');
    const env = jevEnv({ env: { PATH: '/bin' }, cwd: main });
    assert.deepEqual(env, { PATH: '/bin', TYPESAFE_API_KEY: 'k' });
  });
});

test('TYPESAFE_ENV_FILE=none turns the file off', async () => {
  await withRepo(async ({ main }) => {
    await writeFile(path.join(main, '.env'), 'TYPESAFE_API_KEY=from-file\n');
    const env = { TYPESAFE_ENV_FILE: 'none' };
    assert.deepEqual(jevEnv({ env, cwd: main }), env);
  });
});

test('TYPESAFE_ENV_FILE=<path> reads that file instead', async () => {
  await withRepo(async ({ dir, main }) => {
    await writeFile(path.join(main, '.env'), 'TYPESAFE_API_KEY=from-default\n');
    await writeFile(path.join(dir, 'other.env'), 'TYPESAFE_API_KEY=from-other\n');
    const env = jevEnv({ env: { TYPESAFE_ENV_FILE: path.join(dir, 'other.env') }, cwd: main });
    assert.equal(env.TYPESAFE_API_KEY, 'from-other');
  });
});

test('no .env, or no repo at all, is no key and never an error', async () => {
  await withRepo(async ({ dir, main }) => {
    assert.deepEqual(jevEnv({ env: {}, cwd: main }), {});
    assert.deepEqual(jevEnv({ env: {}, cwd: dir }), {});
    const missing = { TYPESAFE_ENV_FILE: path.join(dir, 'missing') };
    assert.deepEqual(jevEnv({ env: missing, cwd: main }), missing);
  });
});

test('an unreadable file is no key and never an error', async () => {
  await withRepo(async ({ main }) => {
    await mkdir(path.join(main, '.env'));
    assert.deepEqual(jevEnv({ env: {}, cwd: main }), {});
  });
});

test('envFilePath names the file jevEnv reads, or null when there is none', async () => {
  await withRepo(async ({ dir, main, worktree }) => {
    assert.equal(envFilePath({ env: {}, cwd: worktree }), path.join(main, '.env'));
    assert.equal(envFilePath({ env: { TYPESAFE_ENV_FILE: 'x.env' }, cwd: main }), path.join(main, 'x.env'));
    assert.equal(envFilePath({ env: { TYPESAFE_ENV_FILE: 'none' }, cwd: main }), null);
    assert.equal(envFilePath({ env: {}, cwd: dir }), null);
  });
});

test('the env passed in is never changed', async () => {
  await withRepo(async ({ main }) => {
    await writeFile(path.join(main, '.env'), 'TYPESAFE_API_KEY=from-file\n');
    const env = {};
    jevEnv({ env, cwd: main });
    assert.deepEqual(env, {});
  });
});

// The wiring every CLI relies on: createClient() with no env reads the .env of its clone.
const available = (cwd, env) =>
  execFileSync(
    process.execPath,
    ['--input-type=module', '-e', `import { createClient } from ${JSON.stringify(path.join(HERE, 'client.mjs'))};
console.log((await createClient().available()).status);`],
    { cwd, env: { ...GIT_ENV, ...env }, encoding: 'utf8' },
  ).trim();

test('createClient() with no env finds the key in the .env of the clone it runs in', async () => {
  await withRepo(async ({ main, worktree }) => {
    assert.equal(available(worktree, {}), 'skipped');
    await writeFile(path.join(main, '.env'), 'TYPESAFE_API_KEY=from-file\n');
    assert.equal(available(worktree, {}), 'ok');
    assert.equal(available(worktree, { TYPESAFE_ENV_FILE: 'none' }), 'skipped');
  });
});

