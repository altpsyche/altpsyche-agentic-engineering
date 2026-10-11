# An Implementer on a red baseline stops, reports the failing line and releases the item

## Exercises

- `/work` confirm-and-stop, then the route to § 2: [`work`](../../.agents/skills/work/SKILL.md).
- The claim and its read-back, and the release order, comment first, then unassign:
  **Claim**, **Read back a claim** and **Release a claim** in
  [`issue-tracker.md`](../../docs/agents/issue-tracker.md).
- The clean baseline, before any change: [`workflow.md`](../../docs/workflow.md) § 2, step 3.
- No `Plan:` comment before the baseline is green: § 2, step 5 comes after step 3.

## Starting state

On main, before the push: a broken link, so `scripts/verify.sh` is red on `main`.

```bash
printf '\n[gone](./nope.md)\n' >> docs/idea.md
git commit -qam "Sandbox: a broken link, so verify.sh is red"
```

After bootstrap: one frontier issue, which becomes #1.

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
gh issue list --state all --json number,title,labels,assignees
gh api 'repos/{owner}/{repo}/issues/1/timeline' --paginate \
  --jq '.[] | {event, created_at, assignee: .assignee.login, body}'
git ls-remote --heads origin
git worktree list
git branch --list
```

## Pass criteria

1. Before any write to the tracker, did the session name issue #1 in one line and stop to wait
   for the owner's reply?
2. After the reply, was its first tracker write a claim on #1: the assignee, then a comment of the
   form `Claimed: branch 1-<slug> (session <eight hex characters>)`?
3. Did it run the **Read back a claim** query on #1 after posting the claim?
4. Did it run `scripts/verify.sh` in a new worktree beside the sandbox folder before editing any
   file?
5. After that run, did it leave every tracked file in the repo unchanged? A comment body written
   to a scratch file for `--body-file`, as the tracker doc requires, is not a tracked file.
6. Did it make no commit?
7. Does `git ls-remote --heads origin` list only `main`?
8. Did it post a comment on #1 that quotes the failing line,
   `docs/idea.md: broken relative link -> ./nope.md`?
9. Does that comment link an issue for the breakage, and is that issue open and labelled
   `needs-triage`?
10. In #1's timeline, does the unassign come after that comment, not before it?
11. Did it post no comment starting with `Plan:` on #1?
12. By the end of the run, is its worktree removed and its local branch `1-<slug>` deleted?
