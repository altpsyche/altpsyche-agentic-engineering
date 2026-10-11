# Jev tools

Plain-Node command-line tools that hand closed-set workflow questions to TypeSafe's Jev, so a
thinking model does not spend tokens on them. Why, and the limits on what an answer may decide, are
in [ADR-0002](../../docs/adr/0002-jev-optional-dev-tooling.md). Which step calls each tool, and its
bands, are in the registry, [`docs/agents/jev.md`](../../docs/agents/jev.md). This file is how the
code works.

| File | What it is |
|---|---|
| `constants.mjs` | The pinned model, **every threshold** with the sample it came from (or a note that it has none), the request limits, and the retry and timeout settings. Retune here, in one reviewed edit |
| `client.mjs` | The shared client every tool asks through. `createClient({ env, sleep, timeoutMs })` |
| `issue-input.mjs` | How a CLI reads its issue: by number with `gh issue view`, or from stdin as `gh`'s JSON or plain text with the title first. `gh(args)` runs `gh` for any other read |
| `fake-jev.mjs` | A fake Jev server on localhost, for tests only |
| `cli-runner.mjs` | Runs a CLI as a subprocess with a `gh` stub on PATH that logs each call and answers canned output, for tests only |
| `client.test.mjs` | The client's tests, against the fake server |
| `triage.mjs` | The triage tool, `run(input, { client, root })`. `root` is the repo root its docs are read from; tests point it at a temp tree |
| `triage-cli.mjs` | Its CLI: an issue number or the issue on stdin, read by `issue-input.mjs`; `--json` for JSON |
| `triage.test.mjs` | Tests at the `run()` seam with a fake client, and the CLI as a subprocess against the fake server with a `gh` stub on PATH |
| `readiness.mjs`, `readiness-cli.mjs`, `readiness.test.mjs` | The readiness tool, `run(input, { client })`, its CLI (the issue as triage reads it, `--plan <file>` for the `Plan:` comment) and its tests, at the same seams as triage |
| `duplicates.mjs`, `duplicates-cli.mjs`, `duplicates.test.mjs` | The duplicates tool, `run(input, { client })`, its CLI (an issue number, or a draft on stdin; open issues from `gh issue list`) and its tests, at the same seams as triage |

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
  question that cannot fit beside the state is an error, and nothing is sent. The answers come
  back merged; if any request fails, or any question is left unanswered, the whole call is one
  error, so a tool never acts on half its answers.
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

## Readiness

Asks one request of Nouls, with the ticket's title and body as state, and the plan beside it when
`--plan` gives one:

- **criteria**: does the ticket state acceptance criteria a reviewer can check?
- **seams**: does it name the seams its work is checked at? A pointer to agreed seams counts.
- **criterion_N**, with a plan only: does a plan step cover criterion N? The criteria are parsed,
  not asked about: each list item under the first heading naming acceptance criteria, up to the
  next heading, checkbox stripped. No such section means no coverage questions, and the CLI says
  so in one line.

Each question is phrased positively, since Jev reads negations literally, and a criterion's text
is quoted as JSON and named as data, since Jev can be swayed by injected text (ADR-0002). A noul outside
0 to 1 is an error. A blank plan is an error before anything is asked.

## Duplicates

Asks one Score per open issue, with the issue or draft as state and the open issue's title and
body, cut to `DUPLICATES_BODY_CHARS`, quoted as JSON and named as data in its question, so batching
packs them. The levels run
different (0), maybe (1), same (2), and Jev's float score is banded by the two `DUPLICATES_`
thresholds. A score off the scale is an error. With no open issues it asks nothing. The CLI reads
open issues with `gh issue list --state open --limit 1000`, drops the issue being checked, and never
writes to the tracker.

## Testing

Every test runs in `scripts/verify.sh`, so CI runs them with no key and no network. Tests reach
the fake server through `TYPESAFE_BASE_URL`, both in-process and when they run a CLI as a
subprocess. Fake keys are short and obviously fake, so the secret scan stays clean.

## Adding a tool

A tool is `<name>.mjs`, exporting `run(input, { client, ... })`, and `<name>-cli.mjs`, its CLI.
Every CLI prints one line per answer, or JSON with `--json`, and exits 0 on a skip or an error,
with one line naming the tool. List it in [`docs/agents/jev.md`](../../docs/agents/jev.md):
`scripts/check-skills.mjs` fails on a CLI the registry does not name.
