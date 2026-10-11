# Agentic development workflow

This project is built primarily by coding agents driven by one human owner, across several harnesses
(Claude Code, Codex, DeepSeek Harness and others). We standardise on the open conventions the ecosystem converged
on: a root `AGENTS.md` (stewarded by the Agentic AI Foundation) as the always-loaded context file, and
[Agent Skills](https://agentskills.io/) `SKILL.md` folders for task-specific instruction. Rather than
symlink a global skill install, we **vendor** the skill suite at a pinned commit into
`.agents/skills/` as ordinary files, so every harness and every model reads one version and a skill
change is a reviewable diff. We keep the upstream lowercase `docs/`, `docs/adr/`, `docs/agents/`
layout precisely because those are the skills' defaults, which means zero path rewrites on update.

## Consequences

- Updating the skill suite is a deliberate, reviewable commit, not an implicit `git pull` of a global
  install. [`docs/agents/`](../agents/) and [`.agents/skills/README.md`](../../.agents/skills/README.md)
  record what was vendored and which local changes must be re-applied.
- `CLAUDE.md` is a symlink to `AGENTS.md`, so harnesses that look for the older name cannot drift.
- Work is spec-driven: idea → grill → spec → tickets → implement test-first → two-axis review. The
  loop is defined once, in [`docs/workflow.md`](../workflow.md).
- The tracker must be machine-readable, because agents claim and close their own work. That is why
  GitHub issues, not prose, hold state. Agents reach it through the `gh` CLI, not a GitHub MCP
  server: models already know `gh`, and a server's tool definitions cost context in every session.
- `.agents/skills/` is the only skills path. Harnesses that discover it natively get commands and
  triggering; the rest, Claude Code among them, read a skill's file because `AGENTS.md` says to.
  Skills name each other by relative link, not by a harness's skill tool.

## Considered options

- **Symlink `~/.claude/skills` into the repo.** Rejected: the repo's behaviour would depend on
  machine state that is invisible in review, and it breaks for a contributor or a fresh CI runner.
- **Ship as a Claude Code plugin only.** Rejected: the project is meant to be built by whatever
  agent the contributor has, and a plugin manifest privileges one vendor.
- **Link each harness's own skills path to `.agents/skills/`** (such as `.claude/skills`).
  Rejected: it adds a path per harness to keep in step, for native triggering that `AGENTS.md`
  already covers by pointer.
- **Write bespoke skills instead of vendoring.** Rejected: the vendored suite is battle-tested, and
  the writing-for-agents discipline it encodes is the expensive part to reproduce.
