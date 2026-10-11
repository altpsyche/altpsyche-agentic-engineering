# Development & Review Workflow

How work moves from idea to merged change. Skills live in
[`.agents/skills/`](../.agents/skills/README.md); the human is the index that reaches for them.

Session start is [`/work`](../.agents/skills/work/SKILL.md): it picks the role and the next item,
confirms both with the owner, then runs the role's step below. See § Starting a session.

## Roles

| Role | Owns | Never does |
|---|---|---|
| **Owner** (human) | Priorities, ADRs, merging, anything on the `ready-for-human` list | Waits on an agent for a decision it could make |
| **Planner** | Sharpening the idea, the spec, the ticket breakdown | Does the implementation work |
| **Implementer** | One ticket, test-first, on a branch | Touches an unrelated file, or merges |
| **Reviewer** | Two-axis review of the diff since a fixed point | Edits the branch under review |

One agent may hold several roles in a session, but never Implementer and Reviewer for the same diff.
A review by the author of the change is not a review: the Implementer's own `/review-pr` at the end
of `/implement` is a self-check, and the review is § 3, run by another session.

In the steps below, a bold name that opens a numbered step or follows "then" or "per" (**Claim**,
**Read back a claim** and the rest) is a command in
[`docs/agents/issue-tracker.md`](agents/issue-tracker.md), which holds its exact form.

## The loop

```
idea → grill → spec → tickets → implement (tdd) → review → fix rounds → merge → retro
        ↑                                                                      ↓
        └──────────────── environment improves ────────────────────────────────┘
```

The last arrow is the point. A `retro` that changes nothing about the environment is a status report.

## Steps

### 1. Plan (Planner)

Reach for `/grill-with-docs` when a repo exists to leave a paper trail in, `/grill-me` when it does
not. It interrogates a frontier of decisions one round at a time, writing terms to `GLOSSARY.md` and
hard-to-reverse choices to `docs/adr/` as they land.

Then `/to-spec` synthesises what was already discussed into `docs/specs/<slug>.md`. It does not
interview; the grilling already did. Then `/to-tickets` cuts the spec into **tracer-bullet** tickets,
each declaring its blocking edges, and publishes them to the tracker with `ready-for-agent` or
`ready-for-human`.

**Done when:** every ticket is small enough for one session, its blockers are declared, and the owner
has confirmed the spec's testing seams.

### 2. Implement (Implementer) — `/implement`

1. **Claim** the issue as the first write, then **Read back a claim**, so two sessions never
   collide. If you do not hold it, back off as that command says.
2. **Branch** as `<n>-<slug>` in a new **Worktree** based on a freshly fetched `origin/main`.
   Nothing is committed to `main`.
3. Clean baseline: in the fresh worktree, before any change, run `scripts/verify.sh`, so
   breakage you inherit is never mistaken for yours. If it is red, do not start. Give up the item
   per **Release a claim**, with a comment that quotes the failing line and links an issue for the
   breakage. When none exists, file one per **Create**, labelled `needs-triage`. The fix is its
   own ticket, not part of this one.
4. Read `AGENTS.md` and the ADRs that touch the area.
5. **Plan**: post the `Plan:` comment before the first commit, so intent is reviewable before the
   work. A session resuming the ticket reads it first and starts at its first unchecked step. At
   the end of each session, edit it in place so its checked steps are the ones committed.
6. Build with `/implement`, driving `/tdd` at the seams agreed during planning: the check that
   proves the work is written before the work. On a bug ticket, which reports something broken
   rather than asking for something new, run `/diagnosing-bugs` first for its reproduction loop.
   The failing check that loop ends with becomes the first `/tdd` slice.
   - Red before green. One slice at a time: one check, the minimal work that passes it, repeat. For
     code the check is a test; elsewhere it is whatever the spec agreed proves the slice done.
   - `scripts/verify.sh` runs regularly, and once more at the end.
   - Look at the real result for anything a person will see or use. A green check is not evidence
     it works in front of them.
   - Commit to the branch; one concern per commit.
7. Self-check: `/implement` closes with `/review-pr` against `origin/main`. Fix what it finds;
   it is not the review (§ Roles).
8. **Open a PR** whose body, written by `/pr` with its Evidence per **Evidence**, says
   `Closes #<n>`, labelled `status:in-review`. Without that label no Reviewer finds it.

**Done when:** the ticket's own acceptance criteria pass, each with an entry in the PR's
`## Evidence` per **Evidence** in [`docs/agents/issue-tracker.md`](agents/issue-tracker.md),
`scripts/verify.sh` is green, every source you made stale is corrected in the same commit, and a PR
whose body says `Closes #<n>` is open and labelled `status:in-review`. On a red baseline, done is
step 3's release instead.

### 3. Review (Reviewer) — `/review-pr`

Run by a session that did not write the diff (§ Roles). When a second model is available, the
Reviewer runs on a different one from the author: a fresh session of the same model shares its
blind spots, as an author grading its own work is lenient.

1. **Claim a PR** with `Claimed: review`, then **Read back a claim**.
2. **Check out a PR** in its own worktree.
3. Run `/review-pr` with a freshly fetched `origin/main` as the fixed point, not `main`: a stale
   local `main` adds already-merged commits to the diff. On a re-review, scope new findings from
   the last report's sha, per "Re-reviews converge" below. Two axes, run as parallel sub-agents
   and reported side by side:
   - **Standards** — does the diff follow `AGENTS.md`, the checklist below, the ADRs that touch it,
     and `CODING_STANDARDS.md` once `/retro` has created it? The checklist is applied in full.
     Before checking the PR's `## Evidence`, run the evidence tool on it, per
     [`docs/agents/jev.md`](agents/jev.md), and check the claims it flags first.
   - **Spec** — does it faithfully implement the originating spec, no more and no less? The spec
     is the issue in the PR's `Closes #<n>`. When the PR closes no issue, review this axis against
     the PR body, say so in the report, and flag the missing issue as a finding; do not stop to
     ask. Before judging the criteria, run the coverage tool on the PR, per
     [`docs/agents/jev.md`](agents/jev.md), and check the criteria it flags first.
4. Set the verdict, then post the report, per **Post a review**. The report is a PR comment that
   opens with `Reviewed at <sha>`, per "Re-reviews converge" below. Every finding names its source
   and quotes the line it is about. The Reviewer never pushes to the branch. A finding that stays
   in the chat does not exist.

**The verdict is strict.** `status:approved` means the report has zero open findings. Any finding at
all, including a judgement call, a low-severity edge case or a nit, sets `status:changes-requested`.
There is no "non-blocking" finding and no "approve, but consider…": a finding worth writing down is
worth a fix round. Severity orders the list; it does not decide the verdict.

**Re-reviews converge.** Every report opens with `Reviewed at <sha>`, the head it reviewed. A
re-review first checks each earlier finding is either fixed or closed by a dispute the reviewer
accepted. It then raises new findings only on lines changed since that sha
(`git diff <sha>..HEAD`), plus any constitution violation anywhere, which always blocks. Code that
passed one round is not re-litigated in the next. If round 3 still ends in changes requested, the
reviewer sets `ready-for-human` instead of `status:changes-requested` and says why in the report:
the loop is not converging, and the owner decides whether to merge, rescope or close. A round's
number is one more than the count of earlier reports on the PR.

**Done when:** the PR carries the verdict label this section sets, and the report, opening with
`Reviewed at <sha>`, is posted on the PR after it, every finding naming its source and quoting its
line.

### 4. Fix rounds (Implementer)

The issue is already claimed and the branch and PR exist, so a fix round skips § 2's claim, branch
and PR steps.

1. **Claim a PR** with `Claimed: fix round`, then **Read back a claim**.
2. **Check out a PR** in its own worktree, on the same branch.
3. Before any change, run `scripts/verify.sh`. The branch carries your own work, so red here is
   yours to fix in this round. It counts as inherited only if `scripts/verify.sh` is also red on
   `origin/main`, per **Check the base**; then § 2's clean-baseline rule applies, with the PR as
   the item.
4. Address every finding, whatever its severity. A finding may be disputed, with a reason and a
   source; "it works" and "it is minor" are not disputes. The reviewer either accepts the dispute,
   which closes the finding, or holds it, which keeps the PR in changes requested. Scope creep found
   in review becomes a new ticket, not a bigger diff.
5. **Return a PR for review**. Its comment answers each finding: fixed in `<sha>`, naming the test
   for a behaviour change, or disputed with a reason and a source.

**Done when:** every finding is fixed or disputed, `scripts/verify.sh` is green, the branch is
pushed, the PR is back on `status:in-review`, and the answering comment is posted after the label.
On a red baseline that is also red on `origin/main`, done is step 3's release instead.

### 5. Merge and learn (Owner)

The owner merges. Then `/retro` looks back over the session and proposes changes to the **environment**
rather than the work: pointers in `AGENTS.md`, a deterministic check where a mistake was mechanical, a
standard where it was a judgement call.

**Unblocking.** When an issue closes, the session closing it removes `status:blocked` from every
issue whose native blockers are now all closed, per **Unblock** in
[`docs/agents/issue-tracker.md`](agents/issue-tracker.md). When a merge closes the issue, that is
whoever merged it: the owner, or the session the owner merged through.

**Done when:** the issue is closed with a comment linking the PR, every issue it unblocked has lost
`status:blocked`, and every accepted retro action has either landed or become its own issue.

## Review checklist

Applied in full on every review. Each line is a hard rule, not a judgement call.

**Correctness**

- Every acceptance criterion in the spec is demonstrably met.
- Every acceptance criterion has an entry in the PR's `## Evidence`, per **Evidence** in
  [`docs/agents/issue-tracker.md`](agents/issue-tracker.md). A criterion without one is a finding.
- A behaviour change has a check that fails without it. Name the check.
- No check asserts an implementation detail, and no expected value is recomputed the way the work
  computes it.

**The constitution** — a violation here blocks the merge outright

<!-- TEMPLATE: replace with this project's constitution from AGENTS.md. -->

- No secret, credential, or personal or confidential data is committed, logged, or shared beyond
  where the owner put it.
- <The project's other non-negotiables.>

**Domain**

<!-- TEMPLATE: the field's hard rules, added as Phase 0 lands: a build or lint for code, a style
guide for writing, a protocol or citation standard for research, a clinical or regulatory rule for
care work. -->

- `scripts/verify.sh` is green, including every check Phase 0 added to it.
- Nothing destructive or irreversible without an ADR.

**Craft**

- The co-located `.md` is updated in the same commit.
- One concern per commit.
- No new system or major part without an ADR.
- `AGENTS.md` is still under 200 lines and still true.

## Where state lives

**The tracker is the state.** Nothing about an item's status lives only in a chat log or a `.md` file.

| State | Representation |
|---|---|
| Needs evaluation | `needs-triage` |
| Blocked on the reporter | `needs-info` |
| Specified, agent can start | `ready-for-agent` |
| Needs human hands | `ready-for-human` |
| Won't action | `wontfix` |
| In review | `status:in-review` |
| Changes requested | `status:changes-requested` |
| Approved, not merged | `status:approved` |
| Blocked by another item | `status:blocked` + a native blocking dependency |
| Phase | one `phase:N` label, mirroring `docs/idea.md` § Roadmap |

Label definitions and creation commands: [`docs/agents/triage-labels.md`](agents/triage-labels.md).
Tracker operations: [`docs/agents/issue-tracker.md`](agents/issue-tracker.md).

## Starting a session

The words that start a session are listed once, in the `description` of
[`/work`](../.agents/skills/work/SKILL.md). When the owner says one without naming a ticket, follow
`/work`: it picks the role and the next item, and waits for the owner's confirmation before
anything is claimed.

## Ending a session

Before ending a session, in this order:

1. The tracker reflects reality: claimed items claimed, and finished work handed on. An
   Implementer's `Plan:` comment is current, per § 2, and its PR is open and labelled
   `status:in-review`; the PR a Reviewer checked carries its verdict.
   The merge closes the issue, per § 5; an Implementer or Reviewer never closes it.
2. The Working Agreement in `AGENTS.md` holds for everything this session committed.
3. This session's worktree is removed, per **Worktree** in
   [`docs/agents/issue-tracker.md`](agents/issue-tracker.md).
