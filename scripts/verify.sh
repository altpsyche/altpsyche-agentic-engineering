#!/usr/bin/env bash
# Everything CI runs. Phase 0 appends the project's own checks below the agent-layer block.
#
#   scripts/verify.sh
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

# Agent layer: skill frontmatter, doc links, CLAUDE.md symlink, AGENTS.md budget. Plain Node, no
# packages. Without Node on this machine it is skipped here; CI always runs it.
if command -v node >/dev/null; then
  node scripts/check-skills.mjs
  node --test scripts/check-skills.test.mjs
else
  echo "verify: node not found, agent-layer check skipped (CI runs it)" >&2
fi

# Project checks: add them here in Phase 0.
