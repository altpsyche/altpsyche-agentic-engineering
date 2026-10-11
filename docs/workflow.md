# Development & Review Workflow

How work moves from idea to merged change. Skills live in
[`.agents/skills/`](../.agents/skills/README.md); the human is the index that reaches for them.

Session start is [`/work`](../.agents/skills/work/SKILL.md): it picks the role, picks the next item
from the tracker, and confirms both before anything is written.

## Roles

| Role | Owns | Never does |
|---|---|---|
| **Owner** (human) | Priorities, ADRs, merging, anything on the `ready-for-human` list | Waits on an agent for a decision it could make |
| **Planner** | Sharpening the idea, the spec, the ticket breakdown | Does the implementation work |
| **Implementer** | One ticket, test-first, on a branch | Touches an unrelated file, or merges |
| **Reviewer** | Two-axis review of the diff since a fixed point | Edits the branch under review |

One agent may hold several roles in a session, but never Implementer and Reviewer for the same diff.
A review by the author of the change is not a review.

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

Claim the ticket as the first write, then read the claim back, so two sessions never collide: the
earliest open claim wins and the other session backs off, per **Read back a claim** in
[`docs/agents/issue-tracker.md`](agents/issue-tracker.md). Then branch as `<n>-<slug>`; nothing is
committed to `main`. Read `AGENTS.md` and the ADRs that touch the area. Then drive `/tdd` at the
seams agreed during planning: the check that proves the work is written before the work.

- Red before green. One slice at a time: one check, the minimal work that passes it, repeat. For
  code the check is a test; elsewhere it is whatever the spec agreed proves the slice done.
- `scripts/verify.sh` runs regularly, and once more at the end.
- Look at the real result for anything a person will see or use. A green check is not evidence it
  works in front of them.
- Commit to the branch; one concern per commit.

**Done when:** the ticket's own acceptance criteria pass, `scripts/verify.sh` is green, every source you
made stale is corrected in the same commit, and a PR whose body says `Closes #<n>` is open and labelled
`status:in-review`.

### 3. Review (Reviewer) — `/review-pr`

Run by a session that did not write the diff. It claims the PR first and reads the claim back, as
an Implementer claims a ticket, and posts the report last, after setting the verdict; the report
releases the claim. Two axes, run as parallel sub-agents and reported side by side:

- **Standards** — does the diff follow `AGENTS.md`, `docs/workflow.md`'s checklist below, the ADRs that
  touch it, and `CODING_STANDARDS.md` once `/retro` has created it? The checklist is applied in
  full.
- **Spec** — does it faithfully implement the originating spec, no more and no less?

When a second model is available, the Reviewer runs on a different one from the author: a fresh
session of the same model shares its blind spots, as an author grading its own work is lenient.

The reviewer sets the verdict and posts the report as a PR comment; it does not push to the branch.
Every finding names its source and quotes the line it is about. The Implementer's own `/review-pr` run
at the end of `/implement` is a self-check, not this step.

**The verdict is strict.** `status:approved` means the report has zero open findings. Any finding at
all, including a judgement call, a low-severity edge case or a nit, sets `status:changes-requested`.
There is no "non-blocking" finding and no "approve, but consider…": a finding worth writing down is
worth a fix round. Severity orders the list; it does not decide the verdict.

**Re-reviews converge.** Every report opens with `Reviewed at <sha>`, the head it reviewed. A
re-review first checks each earlier finding is either fixed or closed by a dispute the reviewer
accepted. It then raises new findings only on lines changed since that sha
(`git diff <sha>..HEAD`), plus any constitution violation anywhere, which always blocks. Code that
passed one round is not re-litigated in the next. If round 3 still ends in changes requested, the
reviewer swaps `status:changes-requested` for `ready-for-human` and says why in the report: the
loop is not converging, and the owner decides whether to merge, rescope or close. A round's number
is one more than the count of earlier reports on the PR.

### 4. Fix rounds

The implementer claims the PR first, and reads the claim back as § 2 does, then addresses every
finding on the same branch, whatever its severity. The issue is already claimed and the branch and
PR exist, so a fix round skips claiming the issue, branching and opening a PR. A finding may be
disputed, with a reason and a source; "it works" and "it is minor" are not disputes. The reviewer
either accepts the dispute, which closes the finding, or holds it, which keeps the PR in changes
requested. Scope creep found in review becomes a new ticket, not a bigger diff.

When the round is done, swap `status:changes-requested` back to `status:in-review`, then post one PR
comment that answers each finding: fixed in `<sha>`, naming the test for a behaviour change, or
disputed with a reason and a source. That comment is the last write, and it releases the claim.

### 5. Merge and learn (Owner)

The owner merges. Then `/retro` looks back over the session and proposes changes to the **environment**
rather than the work: pointers in `AGENTS.md`, a deterministic check where a mistake was mechanical, a
standard where it was a judgement call.

**Done when:** the issue is closed with a comment linking the PR, and every accepted retro action has
either landed or become its own issue.

## Review checklist

Applied in full on every review. Each line is a hard rule, not a judgement call.

**Correctness**

- Every acceptance criterion in the spec is demonstrably met.
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

The owner says "let's work", "next", "continue", "review", or "what's next" without naming a ticket.
That is the `/work` trigger: pick the role, pick the next item, state it in one line, and **wait for
confirmation** before claiming it.
