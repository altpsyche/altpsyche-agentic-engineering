#!/usr/bin/env bash
# Everything CI runs. Phase 0 appends the project's own checks at the end.
#
#   scripts/verify.sh
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

# Agent layer: skill frontmatter, doc links, no harness-specific files, AGENTS.md budget, the
# tracker's claim read-back and frontier queries and the pre-push hook's own test. Plain Node, no
# packages; the query tests also run jq, and skip without it outside CI. Without Node on this
# machine it is skipped here; CI always runs it.
if command -v node >/dev/null; then
  node scripts/check-skills.mjs
  node --test scripts/check-skills.test.mjs scripts/claim-readback.test.mjs scripts/frontier.test.mjs \
    scripts/install-hooks.test.mjs
  # Jev tools (ADR-0002), against a fake local server: no key, no network.
  node --test scripts/jev/*.test.mjs
else
  echo "verify: node not found, agent-layer check and tests skipped (CI runs them)" >&2
fi

# Secrets: all history reachable in this clone, not just the tree, because a secret deleted in a
# later commit is still published. Known false positives go in .gitleaksignore with a reason. Skipped
# locally without gitleaks; CI always installs it.
if command -v gitleaks >/dev/null; then
  gitleaks git --redact --no-banner .
else
  echo "verify: gitleaks not found, secret scan skipped (CI runs it)" >&2
fi

# Project checks: add them here in Phase 0.
