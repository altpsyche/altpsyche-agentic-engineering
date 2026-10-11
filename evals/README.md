# Skill evals

A skill change is proven like code. Each case here is one Markdown file that any agent, in any
harness, on any model, can run, and that a different session grades. When a PR must run them is in
[`docs/workflow.md`](../docs/workflow.md) § 2; this file owns the case format, the sandbox, and how
a case is run and graded.

Cases live at `evals/<skill>/<case>.md`, outside the skill folders, so vendored skills stay
byte-identical to upstream. `scripts/check-skills.mjs` fails if `<skill>` names no folder in
[`.agents/skills/`](../.agents/skills/README.md).

## Three sessions

- **Runner**: the Implementer whose PR needs the case, or the owner. It builds the sandbox, starts
  the run session, plays the owner from the case's script, and collects the result.
- **Run session**: a fresh session, in any harness, on any model, started in the sandbox. It sees
  only the case's prompt and scripted replies. It is not told it is an eval.
- **Grader**: a fresh session that is neither of the other two, on a different model when one is
  available, for the reason in [`docs/workflow.md`](../docs/workflow.md) § 3. It sees only the case
  file and the transcript.

## Case format

A case has these sections, in this order:

- **`# <title>`**: the behaviour under test, in one line.
- **`## Exercises`**: the rules the case tests, each linking to the one file that owns it. This is
  for the grader and for whoever edits the case; the run session never sees it.
- **`## Starting state`**: what the sandbox holds before the prompt, as commands the runner runs
  exactly. `On main, before the push` runs at the marked step of § Sandbox; `After bootstrap` runs
  once the sandbox is up. Either may be absent.
- **`## Prompt`**: the text the runner pastes into the run session, verbatim, in a fenced block.
- **`## Owner replies`**: each scripted reply and the moment it is given. To anything else the
  run session asks, the runner gives the fallback reply in § Running a case, and nothing more.
- **`## Collect`**: commands the runner runs in the sandbox after the run. Their output goes to the
  grader with the transcript.
- **`## Pass criteria`**: numbered yes/no questions, each ending in `?`.

A pass criterion:

- asks one thing, and `yes` is the pass;
- is answerable from the transcript and the collected output alone, by quoting a line of either;
- asks what the session did, never what it meant or how well it did it.

## Sandbox

A run claims issues, comments and pushes, so a case never runs in this repo or a real project. It
runs in a throwaway private GitHub repo built from the branch under test. From a checkout of that
branch, run:

```bash
T=$(openssl rand -hex 4)       # names this run
git clone --single-branch --branch "$(git branch --show-current)" "$PWD" "../eval-$T"
cd "../eval-$T"
git branch -m main
git remote remove origin
git rm -rq evals && git commit -qm "Sandbox: drop the eval cases"
# Here: the case's "On main, before the push" commands, if any.
gh repo create "eval-$T" --private --source . --remote origin --push
scripts/bootstrap.sh
# Then: the case's "After bootstrap" commands.
```

Dropping `evals/` keeps the run session from reading the pass criteria. `scripts/bootstrap.sh`
creates the labels and switches on the pre-push hook. On a free private repo it also warns that it
could not protect `main`; that is expected here.

The sandbox outlives the run, so the grader's quotes can be checked against it. Only the owner
deletes it, with `gh repo delete <owner>/eval-<T> --yes`; no agent deletes a repo.

## Running a case

1. Build the sandbox, with the case's starting state, per § Sandbox.
2. Start the run session with the sandbox clone as its working directory, and paste the prompt.
3. Give each scripted reply at its moment. To anything else, reply only: `I'm not available.
   Follow the repo's docs and decide.` Never hint, correct or explain.
4. Stop when the run session says it is done, or ends a turn waiting on a reply the script does
   not have.
5. Save the transcript to `.scratch/evals/<skill>-<case>-<T>.md` in your own worktree: every
   message, every command and its output, as the harness exports it, or copied by hand where it
   cannot.
6. Run the case's `## Collect` commands in the sandbox, and append each command and its output to
   the same file.

## Grading a case

Hand the grader the case file and the transcript file, and nothing else. For each pass criterion it
answers `yes`, `no` or `unsure`, with the quote from the transcript or the collected output that
decides it. An answer with no quote is `no`. The owner answers each `unsure`; until then the case
has not passed. A case passes only when every criterion is `yes`. The grade looks like:

```
Grade: evals/work/red-baseline.md, run 1a2b3c4d, sandbox from 9f8e7d6
1. yes: "<quote>"
2. no: "<quote>"
Verdict: fail 1/2 (no: 2)
```

The last line is `Verdict: pass N/N`, or `Verdict: fail K/N` with the criteria that were not `yes`
in brackets, as `no:` and `unsure:` lists. The sandbox commit is the head of the branch under test
when the sandbox was cloned.

The grade goes in the PR's `## Evidence`, per **Evidence** in
[`docs/agents/issue-tracker.md`](../docs/agents/issue-tracker.md). A failed case is not rerun until
it passes: fix the skill, or fix the case in its own commit with the reason, then run it again.
