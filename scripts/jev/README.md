# Jev tools

Plain-Node command-line tools that hand closed-set workflow questions to TypeSafe's Jev, so a
thinking model does not spend tokens on them. Why, and the limits on what an answer may decide, are
in [ADR-0002](../../docs/adr/0002-jev-optional-dev-tooling.md). Which step calls each tool, and its
bands, are in the registry, [`docs/agents/jev.md`](../../docs/agents/jev.md). This file is how the
code works.

| File | What it is |
|---|---|
| `constants.mjs` | The pinned model, **every threshold** with the sample it came from (or a note that it has none), the request limits, and the retry and timeout settings. Retune here, in one reviewed edit |
| `client.mjs` | The shared client every tool asks through. `createClient({ env, sleep, timeoutMs })`, and `fitsBesideState(state, id, question)` |
| `fake-jev.mjs` | A fake Jev server on localhost, for tests only |
| `client.test.mjs` | The client's tests, against the fake server |
| `triage.mjs` | The triage tool, `run(input, { client, root })`. `root` is the repo root its docs are read from; tests point it at a temp tree |
| `triage-cli.mjs` | Its CLI: an issue number (read with `gh issue view`), or the issue on stdin as `gh`'s JSON or plain text with the title first; `--json` for JSON |
| `triage.test.mjs` | Tests at the `run()` seam with a fake client, and the CLI as a subprocess against the fake server with a `gh` stub on PATH |
| `prune.mjs` | The doc pruner, `run(input, { client, root })`. Tests point `root` at a temp git repo |
| `prune-cli.mjs` | Its CLI: a PR or issue number (`gh pr view`, falling back to `gh issue view`), or the work on stdin as `gh`'s JSON or plain text with the title first; `--json` for JSON |
| `prune.test.mjs` | Tests at the `run()` seam with a fake client over a temp git repo, and the CLI as a subprocess against the fake server with a `gh` stub on PATH |
| `verify-findings.mjs` | The finding verifier, `run(findings, { client, root })`, and `human(result)`, its CLI's line output. `root` is where the review checklist is read from |
| `verify-findings-cli.mjs` | Its CLI: a findings file, or the findings on stdin, as JSON; `--json` for JSON |
| `verify-findings.test.mjs` | Tests at the `run()` seam with a fake client, and the CLI as a subprocess against the fake server |

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

## Prune

One Noul per unit, "should an agent doing this work read this document?", carrying the unit's
text. The state is the work: its title, its body and the paths it changes (a PR's files; none for
an issue), never the diff, which would crowd the documents out of the limits. The units are found
on every run, so a new doc is judged without an edit here, and listed in `AGENTS.md`'s precedence
order:

- **Each ADR**: a tracked `docs/adr/NNNN-*.md`.
- **Each spec**: a tracked `.md` under `docs/specs/`.
- **Each `docs/idea.md` section**: one per `#` or `##` heading, running to the next, so a `###`
  subsection stays inside the numbered section other docs cite. A heading in a code fence is not
  one.
- **Each co-located `.md`**: a tracked `.md` in a subdirectory, except under `docs/`, a
  dot-directory or `node_modules/`.

Root files are not units: `AGENTS.md` always heads the list, and `README.md` is the front page.
The rest of `docs/` says how to work and is reached by name at the step that needs it, so pruning
it would hide a step from the agent running it. Tracked means `git ls-files` at `root`, with any
`GIT_*` from the caller dropped: an untracked file is not authoritative.

All the questions go to one `ask`, which batches them. A unit that does not fit beside the state,
by `fitsBesideState`, is listed unasked with reason `oversize`, since a missed doc costs more than
a read. An answer that is not a probability, or a missing `docs/idea.md`, is an error line, never
a shorter list.

## Verify findings

One Noul per draft finding: does its quoted line, read against its cited source, support it? Each
finding travels in its own question, beside a short shared state, so `ask` can split many findings
across requests. Every finding comes back, in input order, as `keep` or `flag`; the tool never
removes one. Two kinds are kept without asking:

- **Constitution findings**: the `source` mentions "constitution", or the `excerpt` quotes any
  sentence or semicolon clause of a bullet under **The constitution** in
  [`docs/workflow.md`](../../docs/workflow.md)'s review checklist, or a bullet's first five words,
  ignoring case, punctuation and spacing. A bullet's indented continuation lines count as part of
  it. The bullets are read on every run; a checklist with none is an error line, never a run
  without the exemption. The match errs towards exempting, since ADR-0002 bars Jev from judging a
  constitution item. A finding citing the rule only through `AGENTS.md`, in none of the
  checklist's words, is still checked, so cite one as
  `docs/workflow.md § Review checklist, The constitution`.
- **Too large to check**: a finding whose question does not fit beside the state, by
  `fitsBesideState`.

The input is a JSON array, from a file or stdin. Every field but `id` is a non-empty string; `id`
defaults to `F1`, `F2`, … by position, and ids are unique:

```json
[
  {
    "id": "F1",
    "text": "The finding, as the report states it.",
    "quote": "the line under review the finding is about",
    "source": "docs/workflow.md § Review checklist, The constitution",
    "excerpt": "The text of the cited source the finding relies on."
  }
]
```

Empty input, input that is not JSON or not an array, or a finding that is not an object, has a
blank field or repeats an id, is an error line naming the first problem, and nothing is sent. So is
an answer that is not a probability: a NaN must never compare its way into a keep.

## Testing

Every test runs in `scripts/verify.sh`, so CI runs them with no key and no network. Tests reach
the fake server through `TYPESAFE_BASE_URL`, both in-process and when they run a CLI as a
subprocess. Fake keys are short and obviously fake, so the secret scan stays clean.

## Adding a tool

A tool is `<name>.mjs`, exporting `run(input, { client, ... })`, and `<name>-cli.mjs`, its CLI.
Every CLI prints one line per answer, or JSON with `--json`, and exits 0 on a skip or an error,
with one line naming the tool. List it in [`docs/agents/jev.md`](../../docs/agents/jev.md):
`scripts/check-skills.mjs` fails on a CLI the registry does not name.
