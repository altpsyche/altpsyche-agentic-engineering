# altpsyche agentic engineering

A GitHub template for a repo built primarily by coding agents driven by one human owner. Start a
new project from it and the whole agent layer is already there: vendored skills, the
idea → spec → tickets → test-first → two-axis review loop, tracker conventions, label setup, a
skill checker, CI, and optional cost-cutting tooling.

Extracted from [`altpsyche/errand-knight`](https://github.com/altpsyche/errand-knight), where it
was built and used.

## What you get

| Path | What it is |
|---|---|
| [`AGENTS.md`](AGENTS.md) | The always-loaded context file every harness reads. `CLAUDE.md` is a symlink to it |
| [`.agents/skills/`](.agents/skills/README.md) | [mattpocock/skills](https://github.com/mattpocock/skills) vendored at a pinned commit, plus the local `/work` session router and the `typesafe-ai` reference |
| [`docs/workflow.md`](docs/workflow.md) | Roles, the loop, the strict review verdict, the review checklist, where state lives |
| [`docs/agents/`](docs/agents/) | Tracker commands (claims, read-back, PR frontiers), triage labels, domain-doc rules |
| [`docs/adr/`](docs/adr/) | ADR-0001 agentic workflow, ADR-0002 Jev in dev tooling only |
| [`docs/idea.md`](docs/idea.md) | Skeleton of the product source of truth, with the Roadmap shape the tools read |
| [`docs/dev_setup.md`](docs/dev_setup.md) | Sandbox, SSH and workflow-file push gotchas for agent sessions |
| [`scripts/check-skills.mjs`](scripts/check-skills.mjs) | Dependency-free checker: skill frontmatter, doc links, symlink, `AGENTS.md` budget |
| [`scripts/jev/`](scripts/jev/README.md) | Optional Jev tools: triage helper, doc pruner, finding verifier. Skip cleanly without a key |
| [`scripts/bootstrap.sh`](scripts/bootstrap.sh) | Creates every workflow label on the new repo |

## Using this template

1. **Create the repo**: `gh repo create <owner>/<name> --template altpsyche/altpsyche-agentic-engineering --public --clone`
   (or **Use this template** on GitHub), then `cd` into it.
2. **Install and check**: `pnpm install && pnpm verify`.
3. **Create the labels**: `pnpm bootstrap`.
4. **Fill the placeholders**. `grep -rn 'TEMPLATE\|<Project>\|<owner>' --exclude-dir=node_modules .`
   lists every one:
   - `AGENTS.md` — name, stack, constitution, anti-patterns.
   - `docs/workflow.md` § Review checklist — the constitution bullets and the stack's rules.
   - `docs/idea.md` — easiest via `/grill-with-docs` in an agent session.
   - `docs/dev_setup.md` § Phase 0 prerequisites.
   - `package.json` `name` and `description`; this `README.md`; `LICENSE` holder.
5. **Optional**: export `TYPESAFE_API_KEY` in your own shell to switch the Jev tools on.
6. Tell an agent "let's plan". From then on, "let's work", "next" and "review" drive the loop.

## Keeping it in sync

Improvements found in a project (a `/retro` action, a skill fix) belong here too, so the next
project starts with them. Port them back by hand, one concern per commit; this repo has no
upstream link to the projects made from it.

## Verification

```bash
pnpm verify         # skills:check + scripts:test, everything CI runs
```

## License

[MIT](LICENSE). Vendored skills keep their own licenses (MIT).
