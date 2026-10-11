# Local Dev Setup

Conventions a contributor, or an agent, needs before pushing, running anything system-level, or
standing up the Phase 0 workspace. Only what you cannot discover by looking belongs here.

## The agent sandbox

Agent sessions run inside a **bubblewrap user namespace** in which **root is not mapped**. Every file
that the host owns as `root` therefore renders as `nobody` (uid 65534). This is expected behaviour, not
a broken machine, and it produces three symptoms that look alarming and mean nothing:

| Symptom | Why |
|---|---|
| `Bad owner or permissions on /etc/ssh/ssh_config.d/…` | OpenSSH rejects config not owned by root or you; it sees `65534` |
| `sudo: /etc/sudo.conf is owned by uid 65534, should be 0` | The file is `root:root` on the host; root has no mapping in here |
| `ls -l /etc` shows `nobody nobody` throughout | Same unmapped-uid degradation |

Confirm the diagnosis in one command. Inside the sandbox this returns **nothing**; on the host it
returns hundreds of files:

```bash
find /etc /usr/bin -maxdepth 1 -uid 0      # empty inside the sandbox
stat -c '%u:%g %U:%G' /etc/passwd          # 65534:65534 nobody:nobody  ← inside
cat /proc/self/uid_map                     # 1000 0 1
ps -p 1 -o comm=                           # bwrap
grep NoNewPrivs /proc/self/status          # 1
```

**Do not "fix" any of this.** `chown`/`chmod` on `/etc/ssh` would repair a phantom and risk the real
system. `sudo` cannot work in here by design: `NoNewPrivs: 1` blocks privilege escalation, and there is
no root to escalate to.

`$HOME` is also mounted read-only by DSH policy, even though its Unix permissions look writable. A
command that writes `~/.gitconfig` or `~/.config/**` fails with `Read-only file system`. Configure git
with `--local` (writes `<repo>/.git/config`, inside the workspace) and never `--global` from inside
the sandbox. The one global setting this repo needs, below, is made once on the host.

## Git and GitHub from an agent session

### SSH: the one-line global fix

The system SSH config includes `/etc/ssh/ssh_config.d/*.conf`, and the whole include chain fails the
ownership check above, so every git operation over SSH dies. `-F` makes `ssh` ignore the system-wide
config entirely (per `ssh(1)`), which sidesteps the include. Set it **globally, in a normal terminal on
the host**; from inside the sandbox this write fails with `Read-only file system`:

```bash
git config --global core.sshCommand "ssh -F /dev/null"
```

**Already set on this machine**, and `~/.gitconfig` is tracked in the dotfiles bare repo
(`~/.dotfiles` → `altpsyche/cachy-hyprland-setup`), so a fresh install restores it. This is the whole
reason the fix is global: a per-repo `core.sshCommand` costs one edit per clone and silently misses
every repo you have not visited yet. A new machine needs only `~/.gitconfig`.

`core.sshCommand` affects only git. Interactive `ssh` is untouched, so normal SSH use is unchanged. It
does skip all system-wide ssh config, including the drop-in directory — which is the point.

Verify against a repo that has **no** local `core.sshCommand`, or the check proves nothing:

```bash
ssh -F /dev/null -T git@github.com          # "Hi <user>! You've successfully authenticated"
git -C <any-repo> ls-remote origin HEAD     # succeeds with no per-repo config
```

### Pushing workflow files

This is the one that wastes an afternoon. GitHub refuses `.github/workflows/*` over HTTPS when the push
is authenticated by an **OAuth app token**:

```
! [remote rejected] main -> main (refusing to allow an OAuth App to create or update
  workflow `.github/workflows/ci.yml` without `workflow` scope)
```

**SSH keys bypass this restriction completely** (verified on a throwaway branch, 2026-10-11). The same
push over SSH is accepted with no scope negotiation at all. So:

- **SSH remotes** — editing CI needs nothing special. This is the default here.
- **HTTPS with the `gh` token** — the token needs the `workflow` scope, granted with
  `gh auth refresh -s workflow`. That is an interactive device-flow approval, and `gh` then tries to
  write `~/.config/gh/hosts.yml`, which the sandbox blocks; it needs a one-shot escalation to persist.

Prefer SSH for this repo. Reach for HTTPS only when SSH is unavailable.

### HTTPS fallback

If SSH is not an option, `gh` can supply credentials without touching `~/.gitconfig`:

```bash
git remote set-url origin https://github.com/<owner>/<repo>.git
git config --local credential.helper '!gh auth git-credential'
```


## Verifying outside the sandbox

Anything system-level must be confirmed in a normal terminal, where the mappings are real:

```bash
ssh -T git@github.com                # should greet you
ls -l /etc/ssh/ssh_config.d/         # should read root root
```

If SSH fails **there** too, it is a genuine host problem and the sandbox diagnosis above does not apply.

## The TypeSafe dev key

The dev tooling in [`scripts/jev/`](../scripts/jev/README.md) calls TypeSafe's Jev model to cut
agent cost, and only that tooling does ([ADR-0002](adr/0002-jev-dev-tooling-only.md)). The triage
helper, the doc pruner and the finding verifier, the three tools, read the key from
`TYPESAFE_API_KEY`:

- **Owner's shell only.** Export it in your own shell profile, outside the repo. It is never
  committed, never written to a file in the workspace, and never added as a CI secret.
- **Development credits only.** The key pays for agent tooling on this repo, nothing the app does.
- **Optional.** An agent without the key, which includes every contributor, fork and CI run, skips
  each live Jev call, says so in one line, and carries on with the normal workflow. Nothing fails
  for want of it.

## Phase 0 prerequisites

<!-- TEMPLATE: list what the stack needs on this machine and on CI, measured, with the date. Only
what you cannot discover by looking. -->

## Verification commands

```bash
pnpm skills:check     # agent layer: skill frontmatter, doc links, CLAUDE.md symlink, AGENTS.md budget
pnpm scripts:test     # tests for check-skills.mjs and the Jev tools in scripts/jev/
pnpm verify           # everything CI runs today
```

Phase 0 extends `pnpm verify` with the stack's format, lint, test and typecheck commands. When that lands, update [`AGENTS.md`](../AGENTS.md) and the CI workflow in the same
commit.
