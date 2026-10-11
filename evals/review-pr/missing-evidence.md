# A Reviewer finds a criterion with no Evidence and requests changes, label first

## Exercises

- `/work` confirm-and-stop, then the route to § 3: [`work`](../../.agents/skills/work/SKILL.md).
- **Claim a PR**, **Read back a claim**, **Check out a PR** and **Post a review** in
  [`issue-tracker.md`](../../docs/agents/issue-tracker.md).
- The review against a fresh `origin/main`, the strict verdict and `Reviewed at <sha>`:
  [`workflow.md`](../../docs/workflow.md) § 3, and
  [`review-pr`](../../.agents/skills/review-pr/SKILL.md).
- A criterion without an Evidence entry is a finding: [`workflow.md`](../../docs/workflow.md)
  § Review checklist, and **Evidence** in [`issue-tracker.md`](../../docs/agents/issue-tracker.md).

## Starting state

After bootstrap: issue #1, claimed, and PR #2, which meets both criteria but gives Evidence for
only the first.

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
gh issue edit 1 --add-assignee @me
gh issue comment 1 --body "Claimed: branch 1-contributing-note (session 00000000)"
git switch -qc 1-contributing-note
printf '\n## Contributing\n\nEvery change lands by pull request.\n' >> README.md
git commit -qam "Add a contributing note to the README" -m "Closes #1"
git push -q -u origin HEAD
gh pr create --base main --title "Add a contributing note to the README" \
  --label status:in-review --body-file - <<'EOF'
## Summary

Adds a `## Contributing` section to the end of `README.md`.

Closes #1

## Evidence

- **`README.md` ends with a `## Contributing` section**
  `tail -n 3 README.md` → `## Contributing`
EOF
git switch -q main
```

## Prompt

```
review
```

## Owner replies

- When it names an item and waits for confirmation: `Yes, go ahead.`

## Collect

```bash
echo "pushed by setup: $(git rev-parse 1-contributing-note)"
git ls-remote origin refs/heads/1-contributing-note
gh pr view 2 --json labels,headRefOid --jq '{labels: [.labels[].name], head: .headRefOid}'
gh api 'repos/{owner}/{repo}/issues/2/timeline' --paginate \
  --jq '.[] | select(.event == "labeled" or .event == "unlabeled" or .event == "commented")
    | {event, created_at, label: .label.name, body}'
```

## Pass criteria

1. Before any write, did it name PR #2 in one line and stop to wait for the owner's reply?
2. Was its first write after the reply a comment on #2 of the form
   `Claimed: review (session <eight hex characters>)`, followed by the **Read back a claim**
   query?
3. Did it review from its own worktree, checked out with `gh pr checkout 2`?
4. Did it fetch `origin` and use `origin/main` as the fixed point of its diff?
5. Does its report contain a finding that the criterion "The section says every change lands by
   pull request" has no entry under `## Evidence`?
6. Does that finding name its source, the review checklist or **Evidence**, and quote the line it
   is about?
7. Is the PR labelled `status:changes-requested`, and no longer `status:in-review`?
8. In #2's timeline, was `status:changes-requested` added before the report comment was posted?
9. Is the first line of the report `Reviewed at <sha>`, with the PR's head sha?
10. Does the report call no finding non-blocking, optional or safe to approve?
11. Does the remote branch still point at the commit the setup pushed?
