#!/usr/bin/env bash
# Saves your TypeSafe key where every Jev tool finds it (ADR-0002): TYPESAFE_API_KEY in the file
# `node scripts/jev/env-file.mjs path` names, by default the gitignored .env at the root of the
# main clone, which serves the clone and every sibling worktree. Reads the key without echoing it,
# writes it single-quoted so a `#` or a space in it survives, replaces any earlier
# TYPESAFE_API_KEY line, keeps every other line, and leaves the file readable by you only. It
# refuses a file inside a repo that does not ignore it. scripts/bootstrap.sh offers it. Rerun it to
# change the key; an empty answer changes nothing.
#
#   scripts/jev/set-key.sh
#   printf '%s\n' "$KEY" | scripts/jev/set-key.sh   # no terminal: the key is read from stdin
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"

if ! file="$(node "$here/env-file.mjs" path)"; then
  echo "set-key: no key file in use (TYPESAFE_ENV_FILE=none, or not in a repo); nothing written." >&2
  exit 1
fi
dir="$(dirname "$file")"

if git -C "$dir" rev-parse --is-inside-work-tree >/dev/null 2>&1 &&
  ! git -C "$dir" check-ignore -q "$file"; then
  echo "set-key: $file is not gitignored; refusing to write a key there. Add .env to .gitignore." >&2
  exit 1
fi

if [ -t 0 ]; then
  echo "Paste your TypeSafe API key (input hidden), then Enter:"
  IFS= read -rs key || true
  echo
else
  IFS= read -r key || true
fi
# Trim the ends only: a paste often carries a newline or spaces around the key, never inside it.
key="${key#"${key%%[![:space:]]*}"}"
key="${key%"${key##*[![:space:]]}"}"
if [ -z "$key" ]; then
  echo "set-key: no key given; $file is unchanged."
  exit 0
fi
if [[ "$key" == *"'"* ]]; then
  echo "set-key: a key with a single quote cannot be stored safely; $file is unchanged." >&2
  exit 1
fi

umask 077
tmp="$(mktemp "$dir/.env.XXXXXX")"
trap 'rm -f "$tmp"' EXIT
if [ -f "$file" ]; then
  grep -v '^[[:space:]]*\(export[[:space:]]\+\)\?TYPESAFE_API_KEY[[:space:]]*=' "$file" >"$tmp" || true
fi
printf "TYPESAFE_API_KEY='%s'\n" "$key" >>"$tmp"
chmod 600 "$tmp"
mv "$tmp" "$file"
trap - EXIT

echo "Saved TYPESAFE_API_KEY to $file (mode 600)."
echo "Check it with one live call: echo hello | node $here/injection-cli.mjs"
