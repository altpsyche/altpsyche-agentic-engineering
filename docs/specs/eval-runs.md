# Eval runs

Status: agreed with the owner in a `/grill-with-docs` session on 2026-10-12, after two adversarial
reviews of the first proposal. Decisions that are hard to reverse are in
[ADR-0003](../adr/0003-eval-runs-real-sandboxes-guard-safe-commands.md).

Like the guardrails spec, this changes the agent layer itself, so it names files: here the files
are the interfaces.

## Problem Statement

Proving a skill change with its eval cases costs far more than it should, and the cost is mostly
plumbing, not skill behaviour. On PR #55, 8 cases took about 25 run sessions. Headless sessions
could not run the tracker doc's GraphQL commands or its **Check out a PR**; they improvised and
failed criteria that named the documented command. Each run needed a private GitHub repo that only
the owner may delete. Sessions also skipped the evidence tool, and one report claimed it had run.
The owner wants eval runs that any harness can do, that are cheap to start and clean up, and whose
failures mean the skill misbehaved.

## Solution

- The commands agents type are guard-safe: queries and filters in files, worktrees addressed with
  `git -C`, never entered with `cd`.
- Scripts build a sandbox for a case, collect its results, and delete the sandboxes a merged PR
  used.
- Criteria about mechanics check outcomes; criteria about behaviour stay as they are.
- The review report shows what each Jev tool printed.
- The work lands on a protected integration branch in waves, then as one PR to `main`.

## User Stories

1. As an agent in a non-interactive harness, I want every tracker command in the docs to run as
   written, so that I never improvise a substitute.
2. As an agent, I want each GraphQL query and jq filter in a named file, so that no shell guard
   reads its braces as shell syntax.
3. As an agent, I want worktree commands that never `cd` before a version-control command, so that
   a guard that refuses that pattern does not block me.
4. As a Reviewer, I want **Check out a PR** to put the PR's head in its own worktree, tracking
   `origin`, so that I review exactly what was pushed.
5. As an Implementer in a fix round, I want **Check the base** to work without `gh pr checkout` and
   without leaving my worktree on another commit, so that I return to my branch reliably.
6. As a session ending its work, I want **Worktree** removal to cover a clean tree that holds only
   ignored scratch files, so that I never fall back to `--force` blindly.
7. As the owner, I want a lint that fails when a tracker command inlines braces or starts with
   `cd … &&`, so that the docs cannot regress.
8. As the owner, I want `verify.sh` to say in one visible line when `jq` is missing, so that a local
   green run never silently skips a query test.
9. As the owner, I want the claim read-back and frontier tests to read the same files the docs
   name, so that doc and test cannot drift.
10. As a runner, I want one command that builds a sandbox for a case from the branch under test,
    so that I stop hand-copying Starting state blocks.
11. As a runner, I want one command that runs a case's Collect block in its sandbox and appends the
    output to the transcript, so that grading inputs are complete and exact.
12. As a runner, I want to start the run session in any harness, interactive or headless, so that
    evals do not depend on one vendor's CLI.
13. As a run session, I want the owner's scripted replies as my own turns, so that I never act on
    an approval relayed by another agent.
14. As the owner, I want every sandbox a PR used deleted when it merges, so that repos do not pile
    up on my account.
15. As the owner, I want cleanup to delete only repos that are provably eval sandboxes, so that a
    name in a PR body can never delete a real repo.
16. As the owner, I want cleanup to list old sandboxes it did not delete, so that I can decide
    about strays.
17. As a Reviewer, I want every run of a case, pass or fail, listed by token in the Evidence, so
    that reruns are visible and the no-rerun rule can be checked.
18. As a grader, I want criteria about mechanics to name outcomes, so that I grade the skill, not
    whether a harness allowed a command.
19. As a Reviewer, I want each rewritten criterion checked against the one it replaces, so that a
    rewrite never weakens what a case tests.
20. As the owner, I want the review report to quote each Jev tool's output line, skip lines
    included, so that a tool that was not run is visible.
21. As a Reviewer, I want the evidence tool's documented usage to match how it skips without a key,
    so that running it costs nothing when Jev is off.
22. As the owner, I want integration branches protected like `main`, so that sub-PRs land only
    green and history is never rewritten.
23. As an agent on an integration effort, I want the docs to say how to branch, open a sub-PR,
    review it and close its issue when the base is an integration branch, so that blocked tickets
    unblock.
24. As the owner, I want `bootstrap.sh` to survive a refused rulesets call, so that sandboxes on a
    free private repo bootstrap cleanly.
25. As the owner, I want one final PR to `main` whose Evidence carries every case's grade on its
    head, so that the effort is proven once, end to end.

## Implementation Decisions

**Order.** Wave 0 lands on `main`; waves 1-3 land as sub-PRs into `integration/eval-runs`; then one
PR to `main`.

| Wave | Ticket | Blocked by |
|---|---|---|
| 0 | #53 queue priority (PR #55, merged as `e3afed4`) | — |
| 0 | #51 bootstrap 403 guard | — |
| 0 | #38 integration ruleset + integration-branch docs | #51 |
| 1 | #54 (A) Guard-safe commands | #38, #53 |
| 2 | #42 (B1) Runner scripts and run-mode docs | #54 |
| 2 | #56 (C) Review-step evidence line | #54 |
| 3 | #57 (B2) Cleanup on merge | #42 |
| 3 | #58 (D) Outcome criteria in every case | #54, #42, #56 |
| — | Final PR `integration/eval-runs` → `main` | all |

**#38 extended.** Besides the ruleset in `scripts/bootstrap.sh`, `docs/workflow.md` and
`docs/agents/issue-tracker.md` say, for an integration effort: **Branch** from
`origin/integration/<name>`; **Open a PR** with `--base integration/<name>`; § 3's fixed point is
the PR's base, freshly fetched; `Closes #n` does not fire on a non-default base, so the session that
merges a sub-PR closes its issue and runs **Unblock**, per § 5.

**#54 (A) Guard-safe commands.**
- GraphQL queries for **List PRs** and **Read back a claim**, and every multi-line jq filter
  (including **List the frontier** from #55), move into files under `scripts/queries/`. The doc's
  command names the file. `claim-readback.test.mjs` and `frontier.test.mjs` read those files.
- **Check out a PR**: `gh pr view <n> --json headRefName`, then `git -C <main clone> fetch origin`
  and `git -C <main clone> worktree add --track -B <branch> ../<repo>-<n> origin/<branch>`. No `cd`,
  no `gh pr checkout`.
- **Check the base** checks `origin/main` out in a separate detached worktree, runs `verify.sh`
  there, and removes it; the branch's worktree never moves.
- **Branch** and **Worktree** use `git -C`; removal covers a clean tree holding only ignored files
  (#50): move needed `.scratch/` files out, then `--force`.
- `check-skills.mjs` gains the lint in story 7, over the tracker doc, `docs/workflow.md`, skills
  and eval cases.
- `verify.sh` prints one line when `jq` is missing (absorbs #32).
- Every doc, skill and case line that names `gh pr checkout` or the old commands is updated.

**#42 (B1) Runner scripts.** `scripts/eval-sandbox.sh <case>` builds the sandbox exactly as
`evals/README.md` § Sandbox defines it, marks the repo (its description names the run token and
source commit), runs the case's Starting state blocks at their marked steps, and prints the token,
the path and the prompt. `scripts/eval-collect.sh <case> <token> <transcript>` runs the Collect
block command by command and appends each with its output. `evals/README.md` points at both and
keeps the manual steps as the definition. § Three sessions says the run session is any harness and
receives replies as its own turns (#43).

**#57 (B2) Cleanup on merge.** `scripts/eval-cleanup.sh <pr>` reads the run tokens from the merged PR's
Evidence and deletes each `eval-<token>` repo only when the name matches `^eval-[0-9a-f]{8}$`, the
owner is the logged-in account, it is private and its description carries the marker; it removes
only local folders matching that name with an optional `-<n>` suffix, beside the main clone. It
lists, never deletes, other `eval-*` repos older than 7 days. § 5 adds the step; **Evidence** says
every run of a case is listed by token; `evals/README.md` § Sandbox replaces "only the owner
deletes it" with this script.

**#56 (C) Review-step evidence line.** § 3's report gains a `Jev:` line per tool run, quoting its first
output line. `docs/agents/jev.md` documents that `evidence-cli` skips without a key before reading
its outputs file, so running it costs nothing when Jev is off.

**#58 (D) Outcome criteria.** Each case's criteria about mechanics are reworded to outcomes, per
ADR-0003; criteria about behaviour are unchanged. Each rewrite says, in the PR, which criterion it
replaces and why it tests no less.

**Final PR.** It adds ADR-0003 to the `AGENTS.md` ADR index, which the planning PR leaves out
so that it needs no eval run. Every case runs once on the integration head with the new scripts,
graded by a Sonnet session; the Evidence lists every run by token. A failure gets a fix sub-PR
and a run on the new head, never a bare rerun.

## Testing Decisions

A good check tests behaviour at the highest seam the owner agreed, and never re-derives an expected
value the way the code does.

- **(A):** `claim-readback.test.mjs` and `frontier.test.mjs` run the query and filter files on
  fixtures; `check-skills.test.mjs` gains a fixture that fails the brace/`cd` lint.
- **(B1):** a test parses every case's Starting state and Collect blocks and fails on one it cannot
  parse. No network: `gh repo create` stays untested.
- **(B2):** a test runs the cleanup with a stubbed `gh` and proves it deletes only a marked,
  private, owned `eval-<8 hex>` repo, and nothing for each guard that fails.
- **(C):** the existing `evidence.test.mjs` skip test; the docs by reading.
- **(D):** the case-format lint, plus the final PR's full eval run.
- **#51/#38:** a stubbed-`gh` test of a 403 rulesets response (one warning, no PUT); a test that the
  ruleset JSON parses and names its target and rules; one live bootstrap run as evidence.

Prior art: `claim-readback.test.mjs` (doc-read fixtures), `install-hooks.test.mjs` (temp repos),
`scripts/jev/*.test.mjs` (fake server and stubs).

## Out of Scope

- Tracker verbs and a fake tracker backend: deferred, with reopening triggers, in ADR-0003.
- An `EVAL_AGENT_CMD` adapter that drives a run session; any harness's CLI may be used by hand.
- #44's inherited-failure rule and #45's full run before a Phase closes: their own tickets.
- Jev threshold retuning (#37).
