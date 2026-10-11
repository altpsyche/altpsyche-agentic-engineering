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
| prune | `scripts/jev/prune-cli.mjs <issue or PR>` | [`workflow.md`](../workflow.md) § 2, step 4, and § 3, the Standards axis | Per ADR, spec, `docs/idea.md` section and co-located `.md`: a noul at or above `PRUNE_INCLUDE_NOUL` is a `read` line; below it is a `skip` line, and you skip that doc. `AGENTS.md` always heads the list, and a unit too large to ask about is a `read` line marked `oversize, not asked`. The list only orders your reading: a doc you find you need is read whatever it says, and a Reviewer still applies the checklist in full |
| verify-findings | `scripts/jev/verify-findings-cli.mjs <findings.json>` | [`workflow.md`](../workflow.md) § 3, step 4 | Per draft finding: a noul at or above `VERIFY_KEEP_NOUL` is `keep`; below it is `flag`, and you re-read the cited source once, then keep or drop the finding yourself. The tool never drops a finding and never sets the verdict. A finding citing the constitution is kept unasked, and you never drop one on a flag alone; one too large to check is kept unasked. Input format: [`scripts/jev/README.md`](../../scripts/jev/README.md) § Verify findings |
| evidence | `scripts/jev/evidence-cli.mjs <pr> <outputs.json>` | [`workflow.md`](../workflow.md) § 3, the Standards axis | Per `## Evidence` claim, once you have run its command yourself: a claim with no quoted result, with no output from you, or whose quote is not in your output, is flagged unasked. Otherwise a `supports` at or above `EVIDENCE_SUPPORTS_CONFIDENT` is noted, and anything else (`contradicts`, `silent`, or a less confident `supports`) is flagged. Check the flags first. A note saves no check: you still check every entry, and every finding is yours. The tool never runs a command from the PR. Input format: [`scripts/jev/README.md`](../../scripts/jev/README.md) § Evidence |
| coverage | `scripts/jev/coverage-cli.mjs <pr>` | [`workflow.md`](../workflow.md) § 3, the Spec axis | Per acceptance criterion of the issue the PR closes: a noul at or above `COVERAGE_COVERED_NOUL`, with the Choice on a hunk or a test, is noted as covered, with that line. Anything else is flagged: `uncovered` below `COVERAGE_UNCOVERED_NOUL`, `uncertain` between, or when the Choice is `none`. A criterion too large to ask about is flagged unasked. Check the flags first. A note proves nothing: you still judge every criterion, and every finding is yours |

Thresholds live in [`scripts/jev/constants.mjs`](../../scripts/jev/constants.mjs), each with the
sample it came from, or a plain note that it has none yet. Retuning one is an edit there, and the
band-edge tests beside it fail until they are updated in the same commit.
