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
| [`AGENTS.md`](AGENTS.md) | The one context file every agent loads first, in any harness. There is no per-harness copy |
| [`.agents/skills/`](.agents/skills/README.md) | [mattpocock/skills](https://github.com/mattpocock/skills), copied in at a pinned commit, plus the local `/work` session router |
| [`evals/`](evals/README.md) | Eval cases for the core skills: any agent runs one in a throwaway repo, and another session grades it |
| [`docs/workflow.md`](docs/workflow.md) | Roles, the loop, the strict review verdict, the review checklist, where state lives |
| [`docs/agents/`](docs/agents/) | Tracker commands (claiming an item, confirming the claim, finding PRs to work on), triage labels, how agents use the domain docs, and [`jev.md`](docs/agents/jev.md), the registry of Jev tools: which step calls each and what its answers may decide |
| [`docs/adr/`](docs/adr/) | ADR-0001: why the workflow is built this way. ADR-0002: Jev answers closed-set questions, optionally |
| [`docs/idea.md`](docs/idea.md) | Skeleton of the project's source of truth |
| [`scripts/verify.sh`](scripts/verify.sh) | Everything CI runs; Phase 0 appends the project's own checks |
| [`.githooks/pre-push`](.githooks/pre-push) | A git pre-push hook that runs `scripts/verify.sh` and blocks the push when it fails. It belongs to git, so it binds every harness alike |
| [`scripts/install-hooks.sh`](scripts/install-hooks.sh) | Switches the hook on by setting `core.hooksPath`; run it once per clone |
| [`scripts/check-skills.mjs`](scripts/check-skills.mjs) | Checks skill frontmatter, doc links, that nothing is wired for one harness, that every eval folder names a skill, that every Jev CLI is in `docs/agents/jev.md`, and the `AGENTS.md` line and byte budgets; no packages |
| [`scripts/jev/`](scripts/jev/README.md) | Optional plain-Node tools that hand closed-set workflow questions to TypeSafe's Jev (ADR-0002). Without `TYPESAFE_API_KEY` each prints one skip line and the agent does the step itself; never run in CI. `scripts/jev/set-key.sh` saves your key to the main clone's gitignored `.env` |
| [`scripts/bootstrap.sh`](scripts/bootstrap.sh) | Switches on the pre-push hook, offers to save the optional Jev key, creates every workflow label and protects `main`: changes land only by PR with `verify` green |

## Using this template

1. **Create the repo**: `gh repo create <owner>/<name> --template altpsyche/altpsyche-agentic-engineering --private --clone`
   (or **Use this template** on GitHub), then `cd` into it.
2. **Create the labels, protect `main` and switch on the pre-push hook**: `scripts/bootstrap.sh`.
   On a private repo the branch ruleset needs a paid plan; without one the script warns and `main`
   stays open. The hook is per clone: in any other clone, run `scripts/install-hooks.sh`.
3. **Fill the placeholders**. `grep -rn 'TEMPLATE\|<Project>\|<owner>' .` lists every one:
   - `AGENTS.md`: name, what the project is, its constitution, anti-patterns.
   - `docs/workflow.md` § Review checklist: the constitution and the field's hard rules.
   - `docs/idea.md`: easiest via `/grill-with-docs` in an agent session.
   - This `README.md` and the `LICENSE` holder.
4. **Check**: `scripts/verify.sh`.
5. Tell an agent "let's plan". From then on, the words in `/work`'s `description`, such as
   "let's work", "next" and "review", drive the loop.
   If your harness does not load `AGENTS.md` on its own, tell it to read `AGENTS.md` first, in
   your message or your own user-level settings. The repo carries no per-harness file, so every
   agent starts from the same base.

The vendored skills are written for software, so words like "test" and "PR" appear in them. In any
other field read "test" as "the check agreed in the spec that proves the work done". A PR is still
how a change gets reviewed, whether it changes code, a manuscript or a protocol.

## Keeping it in sync

Improvements found in a project, such as a `/retro` action or a skill fix, belong here too, so the
next project starts with them. Port them back by hand, one concern per commit. This repo has no
upstream link to the projects made from it.

## License

[MIT](LICENSE). Vendored skills keep their own licenses (MIT).
