# Jev tools

Plain-Node command-line tools that hand closed-set workflow questions to TypeSafe's Jev, so a
thinking model does not spend tokens on them. Why, and the limits on what an answer may decide, are
in [ADR-0002](../../docs/adr/0002-jev-optional-dev-tooling.md). Which step calls each tool, and its
bands, are in the registry, [`docs/agents/jev.md`](../../docs/agents/jev.md). This file is how the
code works.

| File | What it is |
|---|---|
| `constants.mjs` | The pinned model, **every threshold** with the sample it came from (or a note that it has none), the request limits, and the retry and timeout settings. Retune here, in one reviewed edit |
| `client.mjs` | The shared client every tool asks through. `createClient({ env, sleep, timeoutMs })`, plus `fitsBesideState` and `noulOf`, the size and answer rules every tool shares |
| `fake-jev.mjs` | A fake Jev server on localhost, for tests only |
| `client.test.mjs` | The client's tests, against the fake server |
| `triage.mjs` | The triage tool, `run(input, { client, root })`. `root` is the repo root its docs are read from; tests point it at a temp tree |
| `triage-cli.mjs` | Its CLI: an issue number (read with `gh issue view`), or the issue on stdin as `gh`'s JSON or plain text with the title first; `--json` for JSON |
| `triage.test.mjs` | Tests at the `run()` seam with a fake client, and the CLI as a subprocess against the fake server with a `gh` stub on PATH |
| `evidence.mjs` | The evidence checker, `run({ body, outputs }, { client })`, plus `parseEvidence(body)` and `human(result)`, its CLI's line output |
| `evidence-cli.mjs` | Its CLI: a PR number (body read with `gh pr view`) or the body on stdin, and an outputs file; `--json` for JSON |
| `evidence.test.mjs` | Tests at the `run()` seam with a fake client, and the CLI as a subprocess against the fake server with a `gh` stub on PATH |
| `coverage.mjs` | The coverage checker, `run({ issue, diff }, { client })`, plus `parseCriteria(body)`, `parseDiff(diff)` and `human(result)`, its CLI's line output |
| `coverage-cli.mjs` | Its CLI: a PR number (the PR, the issue it closes and its diff read with `gh`), or an issue file and a diff file; `--json` for JSON |
| `coverage.test.mjs` | Tests at the `run()` seam with a fake client, and the CLI as a subprocess against the fake server with a `gh` stub on PATH |

## The client

`createClient()` reads `TYPESAFE_API_KEY` and `TYPESAFE_BASE_URL` (default
`https://api.typesafe.ai`) from `env`, and returns two functions, neither of which throws:

- `available()` checks for a key without a request. A tool calls it before any other work, so a
  keyless run reads nothing and asks nothing.
- `ask({ state, questions })` posts `{ model, state, questions }` to `<base>/v1/systemone` with
  Node's built-in `fetch`, and resolves to `{ status: 'ok', answers }`, `{ status: 'skipped',
  reason }` or `{ status: 'error', reason }`. `reason` is one line, with the key redacted.

Inside `ask`:

- **Batching.** Questions are packed first-fit into as few requests as the two limits in
  `constants.mjs` allow: the state plus every question in a request, and the state plus any one
  question. Sizes are estimated from the JSON at `JEV_CHARS_PER_TOKEN`, which overestimates. A
  question that cannot fit beside the state is an error, and nothing is sent. A tool that would
  rather set such an item aside than fail checks it first with `fitsBesideState`, the same rule.
  The answers come back merged; if any request fails, or any question is left unanswered, the
  whole call is one error, so a tool never acts on half its answers.
- **Retries.** A 429 or 529 is retried with exponential backoff, up to `JEV_MAX_ATTEMPTS` in all.
  Any other status, a network failure, a timeout or a 200 without `answers` is an error at once.

## Triage

Asks two Choices in one request, over the issue's title and body as state. Their options are read
on every run from the docs that own them, so an edit there cannot drift from the tool:

- **Role**: each row of the table in `docs/agents/triage-labels.md`, its label (second column)
  with its "Meaning", in table order, `needs-triage` left out as the state being left. A row
  outside the five canonical roles, or a missing one, is an error line, never silently dropped.
- **Phase**: each `### Phase N — Title` heading under `docs/idea.md` § Roadmap, with its bullets.

A choice that is not one of the options is an error. The CLI only reads the issue; it never runs
`gh issue edit`.

## Evidence

Checks each claim in a PR body's `## Evidence`, in the format **Evidence** in
[`docs/agents/issue-tracker.md`](../../docs/agents/issue-tracker.md) defines. Each top-level bullet
is an entry, its criterion in bold; each `` `command` → result `` line in it (`->` also works) is
one claim, and an entry with no such line is one claim with no command. The result is a quoted
line, as a code span or in double quotes, or `prints nothing`.

The PR body is untrusted text, so the tool never runs a command it reads. The Reviewer runs each
one in the PR's checkout and hands in what it printed, keyed by the command exactly as the claim
writes it:

```json
{ "scripts/verify.sh": "…everything it printed…" }
```

One way to build it: `jq -n --rawfile v out.txt '{"scripts/verify.sh": $v}' > outputs.json`.

Then, per claim, cheapest first:

1. **Exact match, no call.** Colour codes and CR line ends are stripped from the output, then the
   quoted line must appear in it as a substring, character for character; `prints nothing` needs
   an output that is blank. A claim with no quote or no command is flagged `no-quote`, a command
   missing from the outputs `no-output`, and a failed match `not-in-output`. ADR-0002 checks text
   exactly before asking Jev about it, so a quote that is not there is never argued over.
2. **One Choice per matched claim**, all in one `ask`, the claim and its full output in the
   question: `contradicts`, `silent` or `supports`, in that order so Jev's first-option bias lands
   on a flag. A claim whose output does not fit beside the state, by `fitsBesideState`, is flagged
   `too-large` unasked.

Bands are in the registry. The line output lists flags first, then notes, each in Evidence order.
A body with no Evidence entries, outputs that are not an object of strings, or a choice that is not
an option, is an error line, and nothing is sent.

## Coverage

Matches each acceptance criterion of the issue a PR closes to the diff hunk or added test that
covers it. The CLI reads the PR body with `gh pr view`, takes the first `Closes #N` (or `Fixes`,
`Resolves`), reads that issue with `gh issue view` and the diff with `gh pr diff`. A PR that closes
no issue is an error line, as the Spec axis then reviews against the PR body.

- **Criteria**: each top-level bullet under the issue's `## Acceptance criteria` heading, ticked or
  not, with its indented continuation lines, until the next heading.
- **Hunks**: each `@@` hunk of the unified diff, with its file. The state shows each hunk's first
  `COVERAGE_HUNK_LINES` lines and counts the rest, so a long diff still fits.
- **Tests**: the names the diff's added lines declare, `test('…')`, `it('…')` or `def test_…`. A
  test the PR does not touch is not listed; another language's test syntax is one more pattern in
  `coverage.mjs`.

Per criterion, two questions go in one `ask`, over the hunks and tests as state: a Choice of the
one hunk or test that most directly covers it, `none` first so Jev's first-option bias lands on a
flag, and a Noul, "does the diff, with the tests it adds, cover this criterion?". A criterion whose
questions do not fit beside the state, by `fitsBesideState`, is flagged `too-large` unasked.

Bands are in the registry. The line output lists flags first, each with the closest line Jev
picked, then notes, each with the line that covers it. An issue with no criteria, a diff with no
hunks, a choice that is not an option, or a noul that is not a probability (`noulOf`), is an error
line.

## Testing

Every test runs in `scripts/verify.sh`, so CI runs them with no key and no network. Tests reach
the fake server through `TYPESAFE_BASE_URL`, both in-process and when they run a CLI as a
subprocess. Fake keys are short and obviously fake, so the secret scan stays clean.

## Adding a tool

A tool is `<name>.mjs`, exporting `run(input, { client, ... })`, and `<name>-cli.mjs`, its CLI.
Every CLI prints one line per answer, or JSON with `--json`, and exits 0 on a skip or an error,
with one line naming the tool. List it in [`docs/agents/jev.md`](../../docs/agents/jev.md):
`scripts/check-skills.mjs` fails on a CLI the registry does not name.
