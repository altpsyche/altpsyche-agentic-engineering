#!/usr/bin/env bash
# One-time setup for a repo made from this template: switches on the pre-push hook in this clone,
# offers to save the optional Jev key, creates every label the workflow uses, so no agent ever
# invents a near-duplicate, then protects the default branch with a ruleset. Idempotent (`--force`
# updates labels, the ruleset is updated by name), so rerun it after adding a phase to
# docs/idea.md § Roadmap.
#
#   scripts/bootstrap.sh
#
# Needs `gh`, authenticated, run inside the clone (gh infers the repo from `git remote -v`).
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

# Local git config, so first: it needs no network, and a gh failure below must not skip it.
scripts/install-hooks.sh

# The optional Jev key (ADR-0002), offered on a terminal; set-key.sh --offer asks only when no key
# is set, and always exits 0, so no answer and no failure there stops the setup below.
if [ -t 0 ]; then scripts/jev/set-key.sh --offer || true; fi

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

# Priority, set only by the owner; no label means normal: docs/agents/triage-labels.md.
label priority:high  d73a4a "Owner priority: picked before normal and low"
label priority:low   c2e0c6 "Owner priority: picked after normal"

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

# Rulesets, each created or updated by name. One list call, and an id comes only from a list that
# succeeded: a refused call prints its error body on stdout, which is not an id. If the API refuses
# the list (a private repo on a plan without rulesets, auth, network), this warns once with gh's
# message and sets no ruleset, so only the prose rules hold. No bypass actors on any of them: every
# agent session runs as the owner's account, so an owner bypass would exempt agents too.
rulesets_err="$(mktemp)"
trap 'rm -f "$rulesets_err"' EXIT
if rulesets="$(gh api "repos/$repo/rulesets" --jq '.[] | "\(.id) \(.name)"' 2>"$rulesets_err")"; then
  rulesets_listed=1
else
  rulesets_listed=0
  message="$(tr -s '\n' ' ' <"$rulesets_err")"
  echo "Could not list rulesets, so no branch is protected: ${message% }." \
    "On a private repo, a plan without rulesets is the usual cause." >&2
fi

# ruleset <name> <what it protects> <json>: PUTs the ruleset the list names <name>, else POSTs a new
# one. After a refused list it does nothing, since the warning above said why. A refused write
# warns for that ruleset and the setup goes on. Every ruleset goes through here, so each gets this
# guard.
ruleset() {
  local name="$1" what="$2" json="$3" id method endpoint
  [ "$rulesets_listed" = 1 ] || return 0
  id="$(awk -v name="$name" '{ id = $1; sub(/^[^ ]+ /, ""); if ($0 == name) { print id; exit } }' <<<"$rulesets")"
  if [ -n "$id" ]; then
    method=PUT endpoint="repos/$repo/rulesets/$id"
  else
    method=POST endpoint="repos/$repo/rulesets"
  fi
  if gh api -X "$method" "$endpoint" --input - <<<"$json" >/dev/null; then
    echo "Ruleset $name: $what takes changes only by PR with verify green"
  else
    echo "Could not set ruleset $name; $what is unprotected. The gh error above says why; on a" >&2
    echo "private repo, a plan without rulesets is the usual cause." >&2
  fi
}

# Protect the default branch: changes land only through a PR with `verify` green, and its history is
# never rewritten or deleted. Prose says "never commit to main"; this makes it true.
default_branch_ruleset="$(cat <<'JSON'
{
  "name": "default-branch",
  "target": "branch",
  "enforcement": "active",
  "conditions": {"ref_name": {"include": ["~DEFAULT_BRANCH"], "exclude": []}},
  "bypass_actors": [],
  "rules": [
    {"type": "deletion"},
    {"type": "non_fast_forward"},
    {"type": "pull_request", "parameters": {
      "required_approving_review_count": 0,
      "dismiss_stale_reviews_on_push": false,
      "require_code_owner_review": false,
      "require_last_push_approval": false,
      "required_review_thread_resolution": false}},
    {"type": "required_status_checks", "parameters": {
      "strict_required_status_checks_policy": false,
      "required_status_checks": [{"context": "verify"}]}}
  ]
}
JSON
)"
ruleset default-branch "the default branch" "$default_branch_ruleset"
