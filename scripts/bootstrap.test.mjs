// Tests for the ruleset step of scripts/bootstrap.sh. Each case copies the script into a temp
// repo with a stand-in install-hooks.sh and this repo's docs/idea.md, and puts a stub `gh` first
// on PATH.
// The stub logs every call and answers the rulesets list as the case asks: refused the way the API
// refuses a free private repo, or a list it filters with the caller's --jq, as gh does.

import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmod, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// The body and message the API gave on a free private repo (#51).
const REFUSAL_BODY =
  '{"message":"Upgrade to GitHub Pro or make this repository public to enable this feature.",' +
  '"documentation_url":"https://docs.github.com/rest/repos/rules","status":"403"}';
const REFUSAL_MESSAGE =
  'gh: Upgrade to GitHub Pro or make this repository public to enable this feature. (HTTP 403)';

// On an error, gh prints the response body on stdout, unfiltered by --jq, and the message on
// stderr. On success it prints the body filtered by --jq, as `jq -r` would.
const STUB_GH = `#!/usr/bin/env bash
printf '%s\\n' "$*" >>"$STUB_LOG"
case "$1 $2" in
  "repo view") echo owner/repo ;;
  "label create") ;;
  "api repos/owner/repo/rulesets")
    if [ "$STUB_LIST" = refused ]; then
      printf '%s\\n' "$STUB_REFUSAL_BODY"
      printf '%s\\n' "$STUB_REFUSAL_MESSAGE" >&2
      exit 1
    fi
    [ "$3" = --jq ] || { echo "stub gh: list called without --jq" >&2; exit 2; }
    printf '%s' "$STUB_LIST" | jq -r "$4" ;;
  "api -X")
    cat >/dev/null
    if [ "$STUB_SET" = refused ]; then echo "gh: Not Found (HTTP 404)" >&2; exit 1; fi ;;
  *) echo "stub gh: unexpected call: $*" >&2; exit 2 ;;
esac
`;

const HAVE_JQ = spawnSync('jq', ['--version']).status === 0;
// Skipped locally without jq. CI never skips: ubuntu runners ship jq, and a missing one fails.
const needsJq = { skip: HAVE_JQ || process.env.CI ? false : 'jq not found (CI runs it)' };

// Git without the caller's config or repo, as in install-hooks.test.mjs: GIT_DIR from an outer hook
// cannot point these commands at the real repo.
const BASE_ENV = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));
Object.assign(BASE_ENV, { GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' });

// Runs bootstrap.sh in a fresh temp repo. `list` is 'refused' or a JSON array of rulesets; `set` is
// 'refused' to refuse every PUT and POST. Returns the exit status, output and the gh calls made.
async function bootstrap({ list, set = 'ok' }) {
  const root = await mkdtemp(path.join(tmpdir(), 'bootstrap-'));
  try {
    const clone = path.join(root, 'clone');
    const bin = path.join(root, 'bin');
    const log = path.join(root, 'gh.log');
    await mkdir(path.join(clone, 'scripts'), { recursive: true });
    await mkdir(path.join(clone, 'docs'));
    await mkdir(bin);
    await copyFile(path.join(REPO, 'scripts/bootstrap.sh'), path.join(clone, 'scripts/bootstrap.sh'));
    await copyFile(path.join(REPO, 'docs/idea.md'), path.join(clone, 'docs/idea.md'));
    await writeFile(path.join(clone, 'scripts/install-hooks.sh'), '#!/usr/bin/env bash\necho hooks\n');
    await writeFile(path.join(bin, 'gh'), STUB_GH);
    await writeFile(log, '');
    for (const file of ['scripts/bootstrap.sh', 'scripts/install-hooks.sh']) {
      await chmod(path.join(clone, file), 0o755);
    }
    await chmod(path.join(bin, 'gh'), 0o755);
    const init = spawnSync('git', ['init', '-q', clone], { env: BASE_ENV, encoding: 'utf8' });
    assert.equal(init.status, 0, init.stderr);

    const env = {
      ...BASE_ENV,
      PATH: `${bin}${path.delimiter}${process.env.PATH}`,
      STUB_LOG: log,
      STUB_LIST: list === 'refused' ? 'refused' : JSON.stringify(list),
      STUB_SET: set,
      STUB_REFUSAL_BODY: REFUSAL_BODY,
      STUB_REFUSAL_MESSAGE: REFUSAL_MESSAGE,
    };
    const result = spawnSync('scripts/bootstrap.sh', [], { cwd: clone, env, encoding: 'utf8', input: '' });
    const calls = (await readFile(log, 'utf8')).split('\n').filter(Boolean);
    return { status: result.status, stdout: result.stdout, stderr: result.stderr, calls };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const writes = (calls) => calls.filter((c) => /^api -X (PUT|POST) /.test(c));
const lines = (text) => text.split('\n').filter(Boolean);

test('a refused rulesets list sets no ruleset and warns once with the API message', async () => {
  const run = await bootstrap({ list: 'refused' });
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(writes(run.calls), [], 'no PUT or POST after a refused list');
  const warnings = lines(run.stderr);
  assert.equal(warnings.length, 1, `one warning, got:\n${run.stderr}`);
  assert.ok(warnings[0].includes(REFUSAL_MESSAGE), `the warning carries the API message:\n${warnings[0]}`);
  assert.ok(!run.stderr.includes('documentation_url'), 'the refusal body is never used as an id');
});

test('a ruleset the list already has is updated in place by its id', needsJq, async () => {
  const run = await bootstrap({ list: [{ id: 7, name: 'other' }, { id: 42, name: 'default-branch' }] });
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(writes(run.calls), ['api -X PUT repos/owner/repo/rulesets/42 --input -']);
  assert.equal(run.stderr, '');
  assert.match(run.stdout, /^Ruleset default-branch: /m);
});

test('a ruleset the list does not have is created', needsJq, async () => {
  const run = await bootstrap({ list: [{ id: 7, name: 'default-branch-old' }] });
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(writes(run.calls), ['api -X POST repos/owner/repo/rulesets --input -']);
  assert.equal(run.stderr, '');
});

test('a refused write still warns for that ruleset and the script goes on', needsJq, async () => {
  const run = await bootstrap({ list: [], set: 'refused' });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(writes(run.calls).length, 1);
  assert.match(run.stderr, /Could not set ruleset default-branch;/);
});
