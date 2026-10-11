# altpsyche agentic engineering

A GitHub template for a project worked on mostly by AI agents, steered by one human owner. It fits
any field: a video game, a research study, a clinical protocol or care workflow, an app. Start a new
project from it and the agent layer is already there. You get vendored skills and a session
router. You get the loop that takes an idea to a spec, then to tickets, then to check-first work,
then to a two-sided review. You also get tracker conventions, label setup, a skill checker and CI.

It installs no packages and assumes no stack. The only tools are `git`, the `gh` CLI, plain Node for
the skill checker, and [gitleaks](https://github.com/gitleaks/gitleaks) for the secret scan. CI
always runs both; locally each is skipped if its tool is missing.

Extracted from [`altpsyche/errand-knight`](https://github.com/altpsyche/errand-knight), where it
was built and used.

## What you get

| Path | What it is |
|---|---|
| [`AGENTS.md`](AGENTS.md) | The context file every agent loads first, in any harness. `CLAUDE.md` is a symlink to it |
| [`.agents/skills/`](.agents/skills/README.md) | [mattpocock/skills](https://github.com/mattpocock/skills), copied in at a pinned commit, plus the local `/work` session router |
| [`docs/workflow.md`](docs/workflow.md) | Roles, the loop, the strict review verdict, the review checklist, where state lives |
| [`docs/agents/`](docs/agents/) | Tracker commands (claiming an item, confirming the claim, finding PRs to work on), triage labels, how agents use the domain docs |
| [`docs/adr/`](docs/adr/) | ADR-0001: why the workflow is built this way |
| [`docs/idea.md`](docs/idea.md) | Skeleton of the project's source of truth |
| [`scripts/verify.sh`](scripts/verify.sh) | Everything CI runs; Phase 0 appends the project's own checks |
| [`scripts/check-skills.mjs`](scripts/check-skills.mjs) | Checks skill frontmatter, doc links, the symlink and the `AGENTS.md` line and byte budgets; no packages |
| [`scripts/bootstrap.sh`](scripts/bootstrap.sh) | Creates every workflow label and protects `main`: changes land only by PR with `verify` green |

## Using this template

1. **Create the repo**: `gh repo create <owner>/<name> --template altpsyche/altpsyche-agentic-engineering --private --clone`
   (or **Use this template** on GitHub), then `cd` into it.
2. **Create the labels and protect `main`**: `scripts/bootstrap.sh`. On a private repo the branch
   ruleset needs a paid plan; without one the script warns and `main` stays open.
3. **Fill the placeholders**. `grep -rn 'TEMPLATE\|<Project>\|<owner>' .` lists every one:
   - `AGENTS.md`: name, what the project is, its constitution, anti-patterns.
   - `docs/workflow.md` § Review checklist: the constitution and the field's hard rules.
   - `docs/idea.md`: easiest via `/grill-with-docs` in an agent session.
   - This `README.md` and the `LICENSE` holder.
4. **Check**: `scripts/verify.sh`.
5. Tell an agent "let's plan". From then on, "let's work", "next" and "review" drive the loop.

The vendored skills are written for software, so words like "test" and "PR" appear in them. In any
other field read "test" as "the check agreed in the spec that proves the work done". A PR is still
how a change gets reviewed, whether it changes code, a manuscript or a protocol.

## Keeping it in sync

Improvements found in a project, such as a `/retro` action or a skill fix, belong here too, so the
next project starts with them. Port them back by hand, one concern per commit. This repo has no
upstream link to the projects made from it.

## License

[MIT](LICENSE). Vendored skills keep their own licenses (MIT).
