// Tests for the pre-push hook, through scripts/install-hooks.sh, the script scripts/bootstrap.sh
// calls. Each case builds a real repo and a bare remote in a temp dir, with this repo's hook and
// install script copied in and a stand-in scripts/verify.sh that passes or fails on demand.

import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmod, copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Git without the caller's config or repo: no global hooksPath, signing or identity leaks in, and
// GIT_DIR from an outer hook (verify.sh runs this test inside the real pre-push) cannot redirect
// these commands at the real repo.
const ENV = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));
Object.assign(ENV, {
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_AUTHOR_NAME: 'Test',
  GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'Test',
  GIT_COMMITTER_EMAIL: 'test@example.com',
});

function run(cwd, cmd, ...args) {
  return spawnSync(cmd, args, { cwd, env: ENV, encoding: 'utf8' });
}

function git(cwd, ...args) {
  const result = run(cwd, 'git', ...args);
  assert.equal(result.status, 0, `git ${args.join(' ')}: ${result.stderr}`);
  return result.stdout.trim();
}

async function setVerify(clone, exitCode) {
  const verify = path.join(clone, 'scripts', 'verify.sh');
  await writeFile(verify, `#!/usr/bin/env bash\necho "stand-in verify"\nexit ${exitCode}\n`);
  await chmod(verify, 0o755);
}

// A clone with the hook and install script committed, a passing verify.sh, and a bare remote.
// The install script has not run yet.
async function withClone(fn) {
  const root = await mkdtemp(path.join(tmpdir(), 'install-hooks-'));
  try {
    const remote = path.join(root, 'remote.git');
    const clone = path.join(root, 'clone');
    git(root, 'init', '-q', '--bare', remote);
    git(root, 'init', '-q', '-b', 'main', clone);
    await mkdir(path.join(clone, 'scripts'));
    await mkdir(path.join(clone, '.githooks'));
    for (const file of ['scripts/install-hooks.sh', '.githooks/pre-push']) {
      await copyFile(path.join(REPO, file), path.join(clone, file));
      await chmod(path.join(clone, file), 0o755);
    }
    await setVerify(clone, 0);
    git(clone, 'add', '-A');
    git(clone, 'commit', '-q', '-m', 'init');
    git(clone, 'remote', 'add', 'origin', remote);
    await fn({ clone, remote });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function install(clone) {
  const result = run(clone, 'scripts/install-hooks.sh');
  assert.equal(result.status, 0, `install-hooks.sh: ${result.stderr}`);
}

function remoteHasMain(remote) {
  return run(remote, 'git', 'rev-parse', '--verify', '-q', 'refs/heads/main').status === 0;
}

test('the install script sets core.hooksPath to .githooks', () =>
  withClone(async ({ clone }) => {
    install(clone);
    assert.equal(git(clone, 'config', '--get', 'core.hooksPath'), '.githooks');
  }));

test('a red verify.sh blocks the push', () =>
  withClone(async ({ clone, remote }) => {
    install(clone);
    await setVerify(clone, 1);
    const push = run(clone, 'git', 'push', '-q', 'origin', 'main');
    assert.notEqual(push.status, 0);
    assert.match(push.stderr, /pre-push: scripts\/verify\.sh failed; push blocked\./);
    assert.equal(remoteHasMain(remote), false);
  }));

test('a green verify.sh lets the push through', () =>
  withClone(async ({ clone, remote }) => {
    install(clone);
    const push = run(clone, 'git', 'push', '-q', 'origin', 'main');
    assert.equal(push.status, 0, push.stderr);
    assert.equal(remoteHasMain(remote), true);
  }));
