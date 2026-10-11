#!/usr/bin/env bash
# Switches on the repo's git hooks in .githooks/ by pointing core.hooksPath at it. core.hooksPath is
# local git config, so it does not travel with a clone: run this once per clone. Worktrees share
# their clone's config, so one run covers them all. scripts/bootstrap.sh calls it. Idempotent.
#
#   scripts/install-hooks.sh
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
git config core.hooksPath .githooks
echo "Git hooks on: core.hooksPath is .githooks"
