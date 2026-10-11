# Jev tools

The registry of the plain-Node tools that hand closed-set questions to TypeSafe's Jev. Why they
exist, and what an answer may never decide, is
[ADR-0002](../adr/0002-jev-optional-dev-tooling.md). How the code works, and how to add a tool, is
[`scripts/jev/README.md`](../../scripts/jev/README.md). A step that uses a tool names it and points
here; this file owns each tool's caller and bands.

## Running one

Every tool is optional. The key, `TYPESAFE_API_KEY`, lives only in the owner's shell, never in CI.

- **Skipped** (no key): the tool prints one `jev <tool>: skipped, …` line and exits 0. Do the step
  yourself, as you would without Jev.
- **Error** (any failure): one `jev <tool>: error, …` line, exit 0. Handle it exactly like a skip,
  and mention the line in your report. A tool's failure never stops work or counts as a result.
- **Answered**: one line per answer, or JSON with `--json`. Act on it only as its band below says.

## Registry

| Tool | CLI | Called from | Bands |
|---|---|---|---|
| triage | `scripts/jev/triage-cli.mjs <issue>` | [`triage-labels.md`](triage-labels.md) § Suggesting a label | Per answer, role and phase: a confidence at or above `TRIAGE_CONFIDENT` is `recommend`, and becomes your recommendation to the owner; below it is `open`, and you decide the role yourself, or treat the phase as unclear. The tool never applies a label, and you never apply a frontier label on its say-so |
| readiness | `scripts/jev/readiness-cli.mjs <issue> [--plan <file>]` | [`triage-labels.md`](triage-labels.md) § Suggesting a label; [`workflow.md`](../workflow.md) § 2, step 5, on the draft `Plan:` | Per check, has acceptance criteria and names seams, and with `--plan` each criterion covered by a step: at or above `READINESS_PASS` is `pass`; below is `gap`, which you fix (add the criterion, the seam or the plan step) or raise with the owner. A pass never makes a ticket ready or a plan done |

Thresholds live in [`scripts/jev/constants.mjs`](../../scripts/jev/constants.mjs), each with the
sample it came from, or a plain note that it has none yet. Retuning one is an edit there, and the
band-edge tests beside it fail until they are updated in the same commit.
