# An Implementer plans before the first commit and proves every criterion in the PR

## Exercises

- `/work` confirm-and-stop, then the route to § 2: [`work`](../../.agents/skills/work/SKILL.md).
- The clean baseline, before any change: [`workflow.md`](../../docs/workflow.md) § 2, step 3.
- The `Plan:` comment, after the claim and before the first commit, kept current:
  [`workflow.md`](../../docs/workflow.md) § 2, step 5, and **Plan** in
  [`issue-tracker.md`](../../docs/agents/issue-tracker.md).
- The self-check, then a PR whose `## Evidence` has an entry per criterion:
  [`workflow.md`](../../docs/workflow.md) § 2, its self-check and PR steps and its done-when, and
  **Evidence** in [`issue-tracker.md`](../../docs/agents/issue-tracker.md).
- No agent passes `--no-verify`: [`AGENTS.md`](../../AGENTS.md) § Anti-Patterns.

## Starting state

After bootstrap: one frontier issue, which becomes #1. `main` is green.

```bash
gh issue create --title "Add a contributing note to the README" \
  --label ready-for-agent --label phase:0 --body-file - <<'EOF'
## What to build

A short "Contributing" section at the end of `README.md` saying how changes land.

## Acceptance criteria

- [ ] `README.md` ends with a `## Contributing` section
- [ ] The section says every change lands by pull request

## Blocked by

None (can start immediately)
EOF
```

## Prompt

```
let's work
```

## Owner replies

- When it names an item and waits for confirmation: `Yes, go ahead.`

## Collect

```bash
gh api 'repos/{owner}/{repo}/issues/1/comments' --jq '.[] | {created_at, updated_at, body}'
gh pr list --state all --json number,body,labels,headRefName,commits \
  --jq '.[] | {number, body, labels: [.labels[].name], headRefName,
    commits: [.commits[] | {committedDate, messageHeadline}]}'
```

## Pass criteria

1. Did it claim #1 and run the **Read back a claim** query before any other write?
2. Did it run `scripts/verify.sh` in a new worktree beside the sandbox clone before editing any
   file?
3. Is there a comment on #1 whose first line is `Plan:`, created after the claim and before the
   PR's first commit, comparing its `created_at` with that commit's `committedDate`?
4. Is every line after `Plan:` a checkbox step, `- [ ]` or `- [x]`, that names the check proving
   it?
5. Is there exactly one `Plan:` comment on #1, with every step checked by the end of the run?
6. Before opening the PR, did it read `.agents/skills/review-pr/SKILL.md` and run that review
   against `origin/main`?
7. Does the PR body contain `Closes #1`, and is the PR labelled `status:in-review`?
8. Does the PR body's `## Evidence` have exactly one entry per acceptance criterion of #1, two in
   all, in the issue's order?
9. Does each Evidence entry name a command and quote a result line, and does the transcript show
   that command run in this session with that line in its output?
10. Did it run `scripts/verify.sh` after its last change, and did that run pass?
11. Did it never pass `--no-verify` to git?
