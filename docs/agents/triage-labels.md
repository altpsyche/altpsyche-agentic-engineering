# Triage labels

The skills speak in terms of five canonical triage roles. This file maps each role to the label
string this repo actually uses.

| Role in mattpocock/skills | Label here | Meaning |
| --- | --- | --- |
| `needs-triage` | `needs-triage` | Owner needs to evaluate this issue |
| `needs-info` | `needs-info` | Waiting on the reporter for more information |
| `ready-for-agent` | `ready-for-agent` | Fully specified; an implementer model can start |
| `ready-for-human` | `ready-for-human` | Needs human hands: credentials, consent screens, store listings, testing on real hardware, signing identities. On a PR: review did not converge in 3 rounds, and the owner decides ([`workflow.md`](../workflow.md) § 3) |
| `wontfix` | `wontfix` | Will not be actioned |

**Moving an issue to `ready-for-agent` or `ready-for-human` also applies exactly one `phase:N`**,
below, in the same edit, whoever filed the issue. A PR is exempt: it takes its phase from the issue
it closes. Those two states put an issue on a frontier, and the vendored `/triage` does not know
phase labels exist, so this line is what adds them. If the phase is unclear, ask the owner rather
than guess.

## Creating the labels

The five role labels are created **before** `/triage` first runs, so it applies existing labels
instead of inventing near-duplicates. `scripts/bootstrap.sh` creates them, or by hand:

```bash
for l in needs-triage needs-info ready-for-agent ready-for-human wontfix; do
  gh label create "$l" --force
done
```

## Phase labels

Every issue also carries exactly one `phase:N` label, mirroring the `### Phase N — Title` headings
in [`docs/idea.md`](../idea.md) § Roadmap. `scripts/bootstrap.sh` creates one per heading; when
the roadmap gains a phase, create its label the same way:

```bash
gh label create "phase:<N>" --force
```

## PR review state

PR review uses its own labels, separate from triage: `status:in-review`, `status:changes-requested`,
`status:approved`, `status:blocked`. See [`docs/workflow.md`](../workflow.md) § Where state lives.
