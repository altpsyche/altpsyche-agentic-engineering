# Template inheritance: ADRs in their own folder, specs dropped

Status: agreed with the owner in a `/grill-with-docs` session on 2026-10-13. Decisions that are
hard to reverse are in
[ADR-0004](../adr/template/0004-template-adrs-in-own-folder-specs-dropped.md).

Like the eval-runs spec, this changes the agent layer itself, so it names files: here the files
are the interfaces.

## Problem Statement

A repo made from this template copies every file, including the template's own decision records
and build history. The ADRs are needed there, since they govern code the child keeps, but nothing
marks them as inherited: the child's first ADR becomes 0004, and once the template adds its own
0004 the two can no longer be reconciled by hand. The template's specs describe how the template
was built and mean nothing to the child. Both carry bare issue refs that, in the child, point at
the child's own unrelated issues.

## Solution

- The template's ADRs move to `docs/adr/template/`, and every later template ADR goes there. A
  child numbers its own ADRs from `docs/adr/0001` and may supersede a template ADR with one of its
  own, never by editing it.
- Issue refs in template ADRs name the template repo, as `altpsyche/altpsyche-agentic-engineering`
  then a hash and the number, and `check-skills.mjs` keeps them that way.
- `scripts/bootstrap.sh` removes the template's specs from a new child in one local commit,
  keeping `docs/specs/README.md` so the folder survives, gated on a sentinel it deletes, and
  skipped in the template repo itself.

## User Stories

1. As the owner of a new child repo, I want the template's ADRs kept, so that the workflow, the Jev
   scripts and the eval runner still have the decisions behind them.
2. As the owner of a new child repo, I want the inherited ADRs apart from mine, so that I can tell
   at a glance which decisions I made.
3. As the owner of a new child repo, I want my first ADR to be 0001, so that my numbering starts
   clean.
4. As the owner of a child repo porting a later template ADR, I want it to keep its template number
   in its own folder, so that it never collides with an ADR I wrote.
5. As the owner of a child repo, I want to supersede an inherited ADR with my own, so that my
   project can decide differently without editing a file I may port again.
6. As an agent in a child repo, I want the precedence rule to say both folders are ADRs and the
   superseding one wins, so that I know which decision holds.
7. As an agent in a child repo, I want every issue ref in an inherited ADR to name the template
   repo, so that I never read the child's own issue as the cited one.
8. As the template's owner, I want `check-skills.mjs` to fail on a bare issue ref under
   `docs/adr/template/`, so that a new template ADR cannot regress.
9. As the owner of a child repo, I want a bare issue ref in my own ADRs to pass, so that the check
   never fights my own refs.
10. As the owner of a new child repo, I want the template's specs gone after bootstrap, so that
    `docs/specs/` holds only what my project builds, and the folder still there, so that links to
    it from `AGENTS.md` and the agent docs stay valid.
11. As the owner of a new child repo, I want that removal in one commit, made before the rulesets
    are set, so that the tree is clean for the pre-push hook and I push it once.
12. As the owner of a child repo rerunning bootstrap after adding a phase, I want the removal not to
    run again, so that my own specs are never deleted.
13. As the template's owner running bootstrap on the template, I want the removal skipped, so that
    the template keeps its specs.
14. As the owner of a new child repo, I want no file that ships to link a removed spec, so that the
    doc-link check stays green after bootstrap and the push it asks for is not blocked.
15. As the template's owner, I want `check-skills.mjs` to fail while the sentinel exists on a link
    to a spec file from a file outside `docs/specs/`, so that a shipped file cannot start depending
    on a spec children never get.
16. As the owner of a child repo, I want that link check to stop once the sentinel is gone, so that
    my own files may link my own specs.
17. As the owner of a new child repo whose bootstrap commit fails, I want the removal undone, so
    that the tree is clean for the pre-push hook and a rerun tries again.
18. As a Planner in the template, I want the docs that say where ADRs go to name
    `docs/adr/template/`, so that I never write a template ADR to the child's folder.
19. As an agent running the Jev prune tool, I want it to find ADRs in both folders, so that a
    governing ADR is never silently left out.
20. As the owner, I want the README's "Using this template" steps to say that bootstrap makes a
    commit to push, so that the step does not surprise me.

## Implementation Decisions

- **The move.** `docs/adr/0001-…`, `0002-…` and `0003-…` move unchanged in name to
  `docs/adr/template/`. ADR-0004 is already there. Every citation follows: `AGENTS.md` (the ADR
  index, which splits into the template's ADRs and the project's own, and the precedence line,
  which adds the supersede rule), `README.md`, `.agents/skills/README.md`, `docs/agents/*.md`,
  `evals/README.md`, `scripts/` comments and messages, the Jev scripts and their tests, and
  `.github/workflows/ci.yml`. Messages that print an ADR number keep the number; only links and
  paths change. `AGENTS.md`'s Where things live row for ADRs names both folders.
- **Where new ADRs go.** Every doc that says where an ADR is written or how it is numbered says
  `docs/adr/template/` for the template and `docs/adr/` for a child: `AGENTS.md`'s Pending line,
  `docs/workflow.md` § 1, and the vendored `domain-modeling` skill's ADR format, whose Numbering
  section scans the folder the ADR goes in. That skill edit is listed under Local changes in
  `.agents/skills/README.md`.
- **The Jev prune tool** finds ADRs in `docs/adr/` and `docs/adr/template/` alike, and its README
  says so. Today its pattern matches only the top folder, so it
  already misses ADR-0004 and would miss every ADR after the move, without an error.
- **Qualified refs.** Each bare issue ref in a template ADR becomes
  `altpsyche/altpsyche-agentic-engineering` followed by the hash and number. ADR-0001's link to the
  guardrails spec becomes an absolute link to that file on the template repo's `main`.
- **`check-skills.mjs`: bare refs.** A file under `docs/adr/template/` fails on an issue ref not
  preceded by an `owner/repo` qualifier. Text in code spans and fenced blocks is ignored, as other
  checks there do. A ref that is the text of a link with an absolute URL target passes, since the
  URL names the repo; ADR-0002 and ADR-0003 already carry refs of that form. The checker's
  existing exclusions for ADRs (old commands quoted) cover the new folder too.
- **`check-skills.mjs`: spec links.** While `docs/specs/.from-template` exists, a relative link to
  a file under `docs/specs/` other than its `README.md`, from a file outside `docs/specs/`, fails,
  naming the file. A link to the folder itself or its `README.md` passes: those survive bootstrap.
  Once the sentinel is gone the check does nothing.
- **`bootstrap.sh`: spec removal.** A new step after the hook switch and the Jev key offer, before
  labels and rulesets. It runs only when `docs/specs/.from-template` exists and the repo's
  `nameWithOwner`, which the script already reads, is not `altpsyche/altpsyche-agentic-engineering`.
  It `git rm`s every tracked file in `docs/specs/` except `README.md`, sentinel included, and
  commits with a message naming ADR-0004. It prints one line saying a commit was made and must be
  pushed. A refused commit (no git identity, say) restores every removed file, sentinel included,
  so the tree is clean and a rerun tries again, then warns and the setup goes on, the way a refused
  ruleset does.
- **The sentinel and the folder's README.** `docs/specs/.from-template` is a short text file saying
  what it is for and linking ADR-0004. `docs/specs/README.md` is new: one line saying the project's
  specs live here, written by `/to-spec`, and nothing about the template, so it reads right in a
  child.
- **README.** "Using this template" step 2 says bootstrap removes the template's specs in a commit
  the owner pushes. "What you get" lists `docs/adr/template/` in place of `docs/adr/`, and its
  description stops at ADR-0002, so it names all four.

## Testing Decisions

A good test runs the real script or checker against a real temporary tree and asserts what an
owner would see: files present or gone, commits made, the exit status and the message. It does not
assert how the script does it.

- **`scripts/bootstrap.test.mjs`**, extending its temp repo and stub `gh`:
  - with the sentinel and a non-template `nameWithOwner`, every file in `docs/specs/` but its
    `README.md` is gone, sentinel included, in exactly one new commit, made before the first
    ruleset call;
  - without the sentinel, no commit is made and `docs/specs/` is untouched;
  - with `nameWithOwner` the template, no commit is made and `docs/specs/` is untouched;
  - after removal, `docs/specs/README.md` is still there;
  - a refused commit leaves the tree clean, with the specs and the sentinel back;
  - a second run after the first makes no commit.
  The temp repo needs a git identity for the commit; the stub's `repo view` answer becomes a case
  option.
- **`scripts/check-skills.test.mjs`**, by its existing fixture style:
  - a bare issue ref under `docs/adr/template/` fails; a qualified one passes; one in a code span
    passes; a bare one in `docs/adr/` passes;
  - a link-text ref whose target is an absolute URL passes under `docs/adr/template/`;
  - with the sentinel, a link to a spec file from outside fails, one from inside passes, and one to
    the folder or its `README.md` passes; without the sentinel, the outside spec link passes.
- **`scripts/jev/prune.test.mjs`**: an ADR under `docs/adr/template/` is found, as one under
  `docs/adr/` is.
- **The move** is proven by `verify.sh`'s doc-link check, which fails on any link the move missed.

## Out of Scope

- Removing anything else a child may not want: `evals/`, the Jev scripts, vendored skills. Each is
  code the child keeps or deletes by choice.
- A link from a child back to the template, or any automatic port. Porting stays by hand.
- Bare issue refs in shipped files outside `docs/adr/template/` (skills, scripts, tests). The ones
  there today are examples or test history; qualifying them is a later cleanup if they mislead.
- An end-to-end test that makes a child and runs `verify.sh` in it. The owner chose the existing
  seams instead: `bootstrap.test.mjs` and `check-skills.test.mjs` in the grilling session, and
  `prune.test.mjs` when the review of #78 added it, both on 2026-10-13.

## Further Notes

- **Eval runs.** The ticket that moves the ADRs edits `AGENTS.md`, so `docs/workflow.md` § 2 step 8
  requires every case in `evals/`. The bootstrap ticket touches no skill and no `AGENTS.md`.
- This spec lives in `docs/specs/`, so children never receive it, by its own decision.
