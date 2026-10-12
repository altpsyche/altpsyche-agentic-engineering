// Tests for scripts/verify.sh. Each case copies it into a temp tree whose checks are stand-ins that
// pass, and runs it with a PATH that holds only the tools named.

import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmod, copyFile, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PASSING_TEST = "import { test } from 'node:test';\ntest('stand-in', () => {});\n";

function which(tool) {
  const found = spawnSync('sh', ['-c', `command -v ${tool}`], { encoding: 'utf8' });
  return found.status === 0 ? found.stdout.trim() : null;
}

// A tree holding verify.sh and a passing stand-in for every script it runs; the agent-layer check
// prints the folder it ran in. A bin folder holds the tools given, plus bash, node and dirname.
async function withTree(tools, fn) {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), 'verify-')));
  try {
    const tree = path.join(root, 'tree');
    await mkdir(path.join(tree, 'scripts', 'jev'), { recursive: true });
    const verify = path.join(tree, 'scripts', 'verify.sh');
    await copyFile(path.join(REPO, 'scripts', 'verify.sh'), verify);
    await chmod(verify, 0o755);
    const source = await readFile(verify, 'utf8');
    for (const script of new Set(source.match(/scripts\/[\w/.-]+?\.mjs/g))) {
      const body = script.endsWith('.test.mjs') ? PASSING_TEST : 'console.log(`checked ${process.cwd()}`);\n';
      await writeFile(path.join(tree, script), body);
    }
    await writeFile(path.join(tree, 'scripts', 'jev', 'stand-in.test.mjs'), PASSING_TEST);

    const bin = path.join(root, 'bin');
    await mkdir(bin);
    await symlink(process.execPath, path.join(bin, 'node'));
    for (const tool of ['bash', 'dirname', ...tools]) {
      const at = which(tool);
      assert.ok(at, `${tool} is not on this machine's PATH`);
      await symlink(at, path.join(bin, tool));
    }
    const elsewhere = path.join(root, 'elsewhere');
    await mkdir(elsewhere);
    await fn({ tree, verify, elsewhere, env: { ...process.env, PATH: bin } });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('run by path from another git repo, it checks the tree it lives in, not that repo', () =>
  withTree(['git'], async ({ tree, verify, elsewhere, env }) => {
    assert.equal(spawnSync('git', ['init', '-q', elsewhere]).status, 0);
    const run = spawnSync(verify, [], { cwd: elsewhere, env, encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, new RegExp(`^checked ${tree}$`, 'm'));
  }));
