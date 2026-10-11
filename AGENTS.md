# <Project> — Agent Context

<!-- TEMPLATE: replace every <...> placeholder, then delete this comment. See README.md § Using this template. -->

<One line: the stack.> <License>, solo maintainer. Repo: `<owner>/<repo>`.

<One paragraph: what the product does, for whom.>

**Product constitution.** <The non-negotiables: what this product never does. These are the product,
not tunable defaults. Mirror them in the review checklist, `docs/workflow.md` § The constitution.>

> **Stay under 200 lines** — this loads into every session. Detail belongs in a co-located `.md`.
> **Session start:** owner says "let's work" / "next" / "review" with no ticket → follow
> [`.agents/skills/work/SKILL.md`](.agents/skills/work/SKILL.md).
> **Skills:** `/name` anywhere in this repo means read `.agents/skills/name/SKILL.md` and follow it.
> No harness registers them as commands; every agent, Claude included, reads the file.
> **Pre-code:** Phase 0 has not landed. [`docs/idea.md`](docs/idea.md) is the product source of truth,
> and the layout below is the plan, not a description of files on disk.

## Where things live

| What | Where |
|---|---|
| Product intent — the WHY | [`docs/idea.md`](docs/idea.md) — authoritative |
| ADRs — the WHY, decided | [`docs/adr/`](docs/adr/), named `NNNN-kebab-title.md` |
| Specs — the WHAT | [`docs/specs/`](docs/specs/) |
| System docs — the HOW | a co-located `.md` beside the code it describes |
| Vocabulary | `GLOSSARY.md`, created lazily by `/domain-modeling`. Until it exists, `docs/idea.md` § Core Concepts is the authority |
| Issues, PR state | **GitHub issues** — see [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md) |
| Local scratch, never authoritative | `.scratch/` (gitignored) |
| Skills | [`.agents/skills/README.md`](.agents/skills/README.md) |
| Sandbox, SSH and build gotchas — read before pushing or running anything system-level | [`docs/dev_setup.md`](docs/dev_setup.md) |

**Precedence when sources disagree:** ADR → spec → `docs/idea.md` → co-located `.md` → this file.
An issue is a request; an ADR is a decision. When they conflict the ADR wins and the issue is wrong.
Fix the stale source in the same commit, or say plainly that you did not.

## Verifying your work

```bash
pnpm verify           # everything CI runs
pnpm skills:check     # skill frontmatter, doc links, CLAUDE.md symlink, under a second
pnpm scripts:test     # tests for the checker and the Jev tools (scripts/jev/)
```

**Prefer running these over reasoning about whether your change is correct.** Phase 0 extends
`pnpm verify` with the stack's format, lint, test and typecheck commands. Update this block and
[`.github/workflows/ci.yml`](.github/workflows/ci.yml) in the same commit that wires them.

## Architecture

Module breakdown, persistence and external integrations live in [`docs/idea.md`](docs/idea.md)
§ Technical Architecture. **Read the relevant module there before adding or reshaping one**; do not
restate it here, it will drift.

<Constraints that are easy to get wrong and expensive to undo, one bullet each, once they exist.>

## Anti-Patterns

Each of these is decided and load-bearing. Sources are authoritative; read them before arguing.

- Do not commit secrets, keys or credentials, and do not add one as a CI secret without an ADR.
- Do not add a telemetry, analytics, crash-reporting, or "anonymous usage" SDK without an ADR.
- Do not use TypeSafe/Jev in app code. It is fenced to repo dev tooling (ADR-0002).
- Do not add a `Manager` suffix, and do not add a module without an ADR.
- <Project-specific anti-patterns, each with its source.>

## ADRs — `docs/adr/`

Read the full ADR when it governs your work; the file is the authority, this is an index.

- **Accepted:** [0001](docs/adr/0001-agentic-development-workflow.md) agentic development workflow ·
  [0002](docs/adr/0002-jev-dev-tooling-only.md) Jev in dev tooling only
- **Pending:** the open questions in [`docs/idea.md`](docs/idea.md) § Open Questions stay there until
  one is decided. A decided question gets a number here and a file in `docs/adr/`.

Adding a system requires an ADR. An ADR outranks code docs and outranks this file.

## Working Agreement

- **Roles — [`docs/workflow.md`](docs/workflow.md).** One ticket → one branch + PR. The reviewer
  is a different session from the author, posts findings on the PR, approves only with zero open
  findings, and never edits the branch; the owner merges. Implementer → `/implement` driving `/tdd` at seams agreed up front, then a PR labelled
  `status:in-review`. Planner → `/grill-with-docs`, then `/to-spec` and `/to-tickets`. Queue and
  session start → `/work`.
- **Update the co-located `.md` in the same commit** as the code, and update the issue. Do not batch
  either to the end of a sprint.
- **One concern per commit** — do not mix a refactor with a feature.
- **Change a convention → change this file in the same commit**, and keep it under 200 lines.
- **Leave the tree clean.** Uncommitted work makes the next agent's picture of the repo wrong.
- **A claim about the code requires reading the code.** Write no finding of the form "X does not
  handle Y" without having read X's implementation of Y.
