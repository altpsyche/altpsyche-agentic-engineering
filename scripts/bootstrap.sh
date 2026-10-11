#!/usr/bin/env bash
# One-time setup for a repo made from this template: creates every label the workflow uses, so no
# agent ever invents a near-duplicate. Idempotent (`--force` updates existing labels), so rerun it
# after adding a phase to docs/idea.md § Roadmap.
#
#   pnpm bootstrap            # or: bash scripts/bootstrap.sh
#
# Needs `gh`, authenticated, run inside the clone (gh infers the repo from `git remote -v`).
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
repo="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
echo "Creating workflow labels on $repo"

label() { gh label create "$1" --color "$2" --description "$3" --force >/dev/null && echo "  $1"; }

# Triage roles: docs/agents/triage-labels.md.
label needs-triage    ededed "Owner needs to evaluate this issue"
label needs-info      d4c5f9 "Waiting on the reporter for more information"
label ready-for-agent  0e8a16 "Fully specified; an implementer model can start"
label ready-for-human fbca04 "Needs human hands"
label wontfix         ffffff "Will not be actioned"

# PR review state: docs/workflow.md § Where state lives.
label status:in-review          1d76db "Waiting for a Reviewer session"
label status:changes-requested  d93f0b "Review found open findings; fix round next"
label status:approved           0e8a16 "Zero open findings; owner merges"
label status:blocked            b60205 "Blocked by another item"

# Phases: one per `### Phase N — Title` under docs/idea.md § Roadmap.
phases="$(awk '/^## /{r=tolower($0) ~ /roadmap/} r && /^### Phase [0-9]+/{print}' docs/idea.md)"
if [ -z "$phases" ]; then
  echo "No '### Phase N — Title' headings under docs/idea.md § Roadmap; no phase labels created." >&2
else
  while IFS= read -r line; do
    n="$(sed -E 's/^### Phase ([0-9]+).*/\1/' <<<"$line")"
    title="$(sed -E 's/^### Phase [0-9]+[[:space:]]*[—–-][[:space:]]*//' <<<"$line")"
    label "phase:$n" c5def5 "$title"
  done <<<"$phases"
fi
