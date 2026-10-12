# Agentic guardrails 2026

Status: agreed with the owner in a `/grill-with-docs` session on 2026-10-12. Decisions that are
hard to reverse are in [ADR-0002](../adr/0002-jev-optional-dev-tooling.md).

This spec changes the agent layer itself, so its "modules" are the repo's docs, skills and scripts.
It names them, against the to-spec template's no-paths advice, because here the files are the
interfaces.

## Problem Statement

The owner runs agents from several harnesses and models on projects made from this template. Four
things go wrong:

- **Agents claim work is done without proof.** A session can push red work, inherit breakage it
  is then blamed for, or say "done" with no command output behind it.
- **Long tickets do not resume.** A ticket that takes more than one session has no record of what
  is done and what is next, and nobody checks the plan before the code.
- **Nothing tests the skills.** A skill edit or an upstream update can break the loop silently.
- **The same rule is written in many places, and the copies drift.** The round-3 review rule
  appears five times. `/work` restates much of `docs/workflow.md`. Two vendored skills conflict
  with local docs: `to-spec` puts specs in the tracker instead of `docs/specs/`, and labels them
  `ready-for-agent` so the frontier hands a spec to an implementer.

Closed-set workflow questions (which label, which docs, does this quote support this finding) also
cost thinking-model tokens they do not need.

## Solution

Every agent, in every harness, on every model, gets the same base, now with:

1. **One copy of each rule.** `docs/workflow.md` owns steps and done-when,
   `docs/agents/issue-tracker.md` owns commands and formats, `/work` only routes, and `AGENTS.md`
   only points.
2. **Proof at both ends of a session.** A clean baseline before work, evidence for every
   acceptance criterion at the end, and a pre-push hook that runs `scripts/verify.sh`.
3. **A plan that is also the progress record.** One `Plan:` comment per ticket, written before the
   first commit and kept current across sessions.
4. **Skill evals.** Cases for the core skills, run whenever the agent layer changes.
5. **Jev, optionally.** Plain-Node tools hand closed-set questions to TypeSafe's Jev. Without a key
   they skip cleanly and the agent does the step itself.

## User Stories

**DRY agent layer**

1. As an agent, I want each rule in exactly one place, so that I cannot follow a stale copy.
2. As an agent starting a session, I want `/work` to route me to the step in `docs/workflow.md`,
   so that I read the step once, from its owner.
3. As the owner, I want `AGENTS.md` to hold one pointer line per role, so that it stays short and
   true.
4. As a Planner, I want `/to-spec` to write `docs/specs/<slug>.md` with no tracker issue and no
   frontier label, so that an Implementer is never handed a spec.
5. As an Implementer working without the owner present, I want the spec's agreed seams to satisfy
   `/tdd`'s confirmation step, so that I do not stop to ask again.
6. As an Implementer on a bug ticket, I want `docs/workflow.md` to send me to `/diagnosing-bugs`,
   so that bugs get a reproduction loop before a fix.
7. As an agent running `/research`, I want a named place for notes, so that findings do not land
   at random paths.
8. As the owner, I want `setup-matt-pocock-skills` gone, so that nobody re-runs it and overwrites
   the customised `docs/agents/` files.
9. As an agent, I want the session trigger words listed once, so that every doc agrees on what
   starts `/work`.

**Proof at both ends**

10. As an Implementer, I want `scripts/verify.sh` run in a fresh worktree before I change anything,
    so that breakage I inherit is never mistaken for mine.
11. As an Implementer whose baseline is red, I want to stop, report the failing line on the item,
    release the claim and point at an issue for the breakage, so that the fix is its own ticket.
12. As an Implementer, I want a pre-push hook that runs `scripts/verify.sh`, so that red work never
    leaves my machine.
13. As the owner, I want agents never to pass `--no-verify`, while I still may, so that the hook
    binds agents and does not trap me.
14. As an Implementer, I want the PR's `## Evidence` section to map each acceptance criterion to the
    command I ran this session and its decisive result line, so that "done" is checkable.
15. As a Reviewer, I want a criterion without evidence to be a finding, so that unproven claims get
    a fix round.

**Plan and progress**

16. As an Implementer, I want to post a `Plan:` comment on the issue before my first commit,
    listing steps as checkboxes, each with the check that proves it, so that intent is reviewable
    before code.
17. As an Implementer resuming a ticket, I want to read and update that one comment, so that I know
    what is done and what is next without the previous chat.
18. As any session, I want claim logic to ignore `Plan:` comments, so that editing or posting the
    plan never releases or resets a claim.
19. As an agent running `/handoff`, I want to link the `Plan:` comment instead of restating it, so
    that progress lives in one place.

**Skill evals**

20. As the owner, I want eval cases for `work`, `to-tickets`, `review-pr` and `tdd`, so that the
    loop's core skills are tested.
21. As an Implementer changing `.agents/skills/` or `AGENTS.md`, I want to run the affected skills'
    evals and record the results under Evidence, so that a skill change is proven like code.
22. As a grader, I want each case to state its prompt, its starting state and its pass criteria, so
    that any agent in any harness can run it and a different session can grade it.
23. As the owner, I want vendored skill folders to stay byte-identical, so that cases live outside
    them.

**Jev foundation**

24. As the owner, I want every Jev tool to skip with one line and exit 0 when no key is set, so that
    projects without Jev run exactly as before.
25. As the owner, I want the tools to call Jev with Node's built-in `fetch`, so that the template
    stays package-free.
26. As the owner, I want the model pinned and every threshold in one constants file, so that
    retuning is one reviewed edit.
27. As the owner, I want CI never to call Jev and to test every tool against a fake server, so that
    no secret is exposed and the fallback is proven.
28. As an agent, I want one registry listing each Jev tool and the step that calls it, so that steps
    name a tool without restating it.
29. As an agent, I want Jev's answers in bands, confident answers acting and the middle band handed
    back to me, so that a cheap judge never decides a verdict, a "done" or a constitution item.

**Jev tools**

30. As a triager, I want a suggested role label and phase for an issue, so that I can recommend
    clear cases to the owner without deliberating.
31. As an agent starting work, I want a list of the ADRs, specs and docs relevant to my item, so
    that I read what governs it and skip the rest.
32. As a Reviewer, I want each draft finding checked against its cited source, with weak ones
    flagged for a re-read and none dropped, so that false findings do not cost a fix round.
33. As a Reviewer, I want each `## Evidence` claim checked against its pasted output, an exact
    match first, so that I check the claims the output does not support first.
34. As a Reviewer on the Spec axis, I want each acceptance criterion matched to the diff line or
    test that covers it, so that uncovered criteria surface before I reason about them.
35. As an Implementer, I want a readiness check on a ticket (criteria present, seams named) and a
    coverage check on my plan (every criterion has a step), so that I do not start on a gap.
36. As a triager or Planner, I want likely duplicates of a new issue or ticket flagged, so that the
    same work is not filed twice.
37. As an agent about to act on outside text, I want issue and PR text screened for injected
    instructions, so that I re-read anything flagged and stop for the owner if it is an attempt.
38. As a grading session, I want each rubric criterion pre-answered over the transcript, with the
    uncertain band sent to a person, so that grading is cheap and never passes on a coin flip.

## Implementation Decisions

**Layering.** Each kind of content has one owner:

- `docs/workflow.md`: the steps and done-when for each role, including the new baseline,
  plan, evidence, eval and bug-ticket rules.
- `docs/agents/issue-tracker.md`: commands and formats, including the `Plan:` format, the claim
  rule that skips it, the PR body's Evidence format, and the override of `to-spec`'s publish step.
- `/work`: only the role table, the frontier queries, confirm-and-stop, the empty-frontier
  fallback, and "run `docs/workflow.md` § N". Its `description` owns the session trigger words;
  `AGENTS.md` and `docs/workflow.md` § Starting a session point at it instead of listing them.
- `AGENTS.md`: one pointer line per role and the conventions list.

Every restated copy becomes a pointer: the round-3 rule, the strict verdict, claims and read-back,
the fix round, `Reviewed at <sha>`, standards sources, self-review, and the label-then-report
order.

**Vendored skills.** Local changes 1-3 in `.agents/skills/README.md` stay. This spec adds one:
`setup-matt-pocock-skills` is removed and listed under "Deliberately left out". Five lines in four
vendored skills still name it:

- four say to run it if the tracker config is missing: `to-spec`, `to-tickets`, `triage` and
  `review-pr`;
- the fifth, in `to-tickets`, says publishing "depends on the tracker `/setup-matt-pocock-skills`
  configured".

They stay byte-identical: the config is always present here, in `docs/agents/`. The DRY pass adds
those five lines to the skills README's "Known upstream wording" note, and drops the removed skill
from that note's `CLAUDE.md` list. The wayfinding seed text in `docs/agents/issue-tracker.md` is not
vendored; it is deleted as part of the DRY pass.

**Overrides of vendored behaviour live in `docs/agents/`**, which the vendored skills already read:

- `to-spec` publishes to `docs/specs/<slug>.md`: no tracker issue, no frontier label. This is the
  "When a skill says publish to the issue tracker" section, which gains a spec case.
- The duplicates check runs at two points, so it covers issues agents file and issues people file:
  - **Before an agent creates an issue.** The same publish section runs it against open issues;
    every skill's publish step passes through that section.
  - **When an issue is triaged.** `docs/agents/triage-labels.md` runs it for the issue being
    triaged, beside the triage tool. That catches issues the owner or a reporter filed through the
    GitHub UI or `gh issue create`, which never pass through a skill.

  `/triage`'s own redundancy check searches the codebase, not issues, so it is not the hook.
- The spec's agreed testing seams count as `tdd`'s confirmation (`docs/agents/domain.md`).
- `/research` saves notes under `.scratch/research/` (`docs/agents/domain.md`).

Story 19 needs no change: `/handoff` already says to reference plans and issues by URL instead of
restating them.

**Bug tickets.** `docs/workflow.md` § 2 sends an Implementer on a bug ticket to `/diagnosing-bugs`
for the reproduction loop. Its failing check becomes the first slice of `/tdd`.

**Unblocking.** `docs/workflow.md` § 5 says who removes `status:blocked`: the session that closes an
issue removes it from every issue whose native blockers are now all closed, with the **Unblock**
command in `docs/agents/issue-tracker.md`. Without an owner the label outlived its blockers, and the
frontier never offered the freed issue. Ticket #4 added this during the DRY pass; it is recorded
here so the spec matches what landed.

**Pre-push hook.** Lives under `.githooks/`, runs `scripts/verify.sh`, and is switched on by a small
install script that `scripts/bootstrap.sh` calls, which sets `core.hooksPath`. `AGENTS.md` lists
`--no-verify` by an agent as an anti-pattern. A git hook belongs to git, not to any harness.
ADR-0001 records that as an amendment, which the owner signs off by merging that ticket's PR.

**Clean baseline.** `docs/workflow.md` § 2: after the worktree is created from `origin/main` and
before any change, run `scripts/verify.sh`. If it is red, stop, as in user story 11. In a fix round
(§ 4) the branch carries the Implementer's own work, so red there is theirs to fix. It counts as
inherited, and story 11 applies, only if `scripts/verify.sh` is also red on `origin/main`.

**`Plan:` comment.** One per issue, posted after the claim and before the first commit. Format:
`Plan:` on the first line, then checkbox steps, each naming its check. Sessions edit it in place.
The **Read back a claim** query skips comments that start with `Plan:`. **List PRs** needs no
change: `Plan:` comments live only on issues.

**Evidence.** The vendored `pr` skill's `## Evidence` is one Before/After pair. This repo's
format, in `docs/agents/issue-tracker.md` beside **Open a PR**, replaces it with one entry per
acceptance criterion: the criterion, the command run this session, and its decisive result line,
with Before/After where a change is visible. `docs/workflow.md` § 2's done-when points at that
format. The review checklist adds the matching rule: a criterion without an entry is a finding.

**Evals.** `evals/README.md` defines the case format and how to run and grade one. Cases live at
`evals/<skill>/<case>.md`, each with a prompt, a starting state, and pass criteria phrased as yes/no
questions. Grading is done by a session other than the one that ran the case, and that session's
grade is what goes under Evidence. `docs/workflow.md` requires the affected skills' evals on any PR
touching `.agents/skills/` or `AGENTS.md`. `scripts/check-skills.mjs` checks that every
`evals/<skill>/` names an existing skill.

**Jev tools** ([ADR-0002](../adr/0002-jev-optional-dev-tooling.md)). Plain-Node CLIs under
`scripts/jev/`:

- **One shared client.** It reports skipped, ok or error, and never throws. It holds the retries
  on 429 and 529 and reads the base-URL override.
- **One constants file** holds the pinned model, every threshold and the request limits: 64k tokens
  a request, and 32k for the state plus the longest question.
- **Batching.** Questions go in as few requests as those limits allow.
- **Output.** Every CLI prints one line per answer by default, or JSON with `--json`, and exits 0
  on skip or error.
- **Error means skip.** An error line is handled exactly like a missing key: the agent does the step
  itself, as it would without Jev, and mentions the error line in its report. No tool's failure
  ever stops work or counts as a result.
- **Registry.** `docs/agents/jev.md` lists each tool, the step that calls it and its bands. Steps
  name the tool and point there.

Every band in the table follows ADR-0002: an answer can save the agent work, or point it at
something to check. It never decides on the session's behalf. Where the table says "flag", the agent
re-reads and decides.

| Tool | Called from | Question shape | Bands |
|---|---|---|---|
| triage | `docs/agents/triage-labels.md` | Choice over role labels, Choice over phases; options read live from the docs | Confident answers become the agent's recommendation, the rest are left open. The owner still directs (`/triage` step 2 waits); the tool never applies a frontier label, since only the owner puts work on a frontier |
| prune | `docs/workflow.md` §§ 2–3 | Noul per ADR, spec, `idea.md` section and co-located `.md` | include at a low bar; `AGENTS.md` always |
| verify-findings | `docs/workflow.md` § 3 | Noul: does the cited excerpt support the finding | keep, or flag for one re-read; never drop; constitution findings skip |
| evidence | `docs/workflow.md` § 3 | Exact string match of the quoted result in the output, then Choice: supports, contradicts or silent | A missing quote or a contradicts is flagged for the Reviewer to check first; supports is noted. The Reviewer still checks every entry, and the finding rule is theirs |
| coverage | `docs/workflow.md` § 3, Spec axis | Per criterion, Choice over diff hunks and test names plus Noul "is it covered" | uncovered and uncertain flagged for the Reviewer; covered noted with its line |
| readiness | `docs/agents/triage-labels.md`, `docs/workflow.md` § 2 | Nouls: has acceptance criteria, names seams; per criterion, does a plan step cover it | gaps flagged for the agent to fix or raise |
| duplicates | `docs/agents/issue-tracker.md` before an agent creates an issue; `docs/agents/triage-labels.md` for the issue being triaged | Score: different, maybe, same, against open issues | same and maybe listed for the agent to decide |
| injection | `docs/agents/issue-tracker.md` § Untrusted text | Nouls for injected instructions | a hit or an uncertain answer is flagged; the agent re-reads that text under § Untrusted text and, if it finds an attempt, stops and tells the owner |
| grade | `evals/README.md` | Noul per pass criterion, over the transcript | each answer is advice to the grading session, which records the grade; uncertain answers are graded by a person |

Thresholds start from `errand-knight`'s calibration where a tool is ported (triage, prune,
verify-findings) and are first guesses elsewhere. Each guess is recorded in the constants file with
the sample it came from, so live runs can retune it.

## Testing Decisions

- **Behaviour at seams, not internals.** Each Jev tool is tested at its `run(input, deps)` seam with
  a fake client, and its CLI as a subprocess against a fake HTTP server on localhost, reached
  through the base-URL override. Every tool has a no-key test proving one skip line and exit 0
  before any other work, and a failed-request test proving the same handling as a skip.
- **Bands at their edges.** Each tool's tests feed fake answers just above and just below every
  threshold it reads from the constants file, so a retune that moves a band shows up as a failing
  test.
- **Prior art.** `scripts/check-skills.test.mjs` builds real temp trees instead of mocks.
  `errand-knight`'s `scripts/jev/*.test.mjs` show the fake-client and fake-server pattern.
- **Checker rules** get a test that fails without them, as today. Eval folders name real skills,
  and every Jev CLI under `scripts/jev/` is listed in `docs/agents/jev.md`. The claim read-back
  jq is tested on fixture comment lists that include a `Plan:` comment.
- **The pre-push hook** is tested through its install script, the one `scripts/bootstrap.sh`
  calls. In a temp repo, the test checks the script sets `core.hooksPath`, a red `verify.sh`
  blocks the push, and a green one lets it through.
- **Doc-only tickets** (DRY pass, baseline, plan, evidence) are proven by `scripts/verify.sh` and
  by the `work` and `review-pr` evals once they exist. Until then, by a Reviewer walking the step
  from its single owner.
- **All tests run in `scripts/verify.sh`**, so CI runs them with no key and no network.

## Out of Scope

- Any harness-specific wiring: hooks inside a harness, plugins, settings files, per-turn routers.
- Jev in CI, or in a project's product code. A product's use of Jev needs its own ADR.
- Evals for skills beyond `work`, `to-tickets`, `review-pr` and `tdd`.
- Moving these changes to `errand-knight`. The owner ports them later.
- Re-vendoring a newer mattpocock/skills.

## Further Notes

- Ticket order: the DRY pass first, so the new rules land in their single owners. The Jev
  foundation blocks every Jev tool. Eval grading is also blocked by the eval format.
- Research behind the choices: Anthropic's harness posts (clean baseline, progress record,
  separate skeptical evaluator), obra/superpowers (verification before completion), HumanLayer
  (plan before implement), and TypeSafe's cookbooks (citation check, line search, batching,
  uncertainty bands).
