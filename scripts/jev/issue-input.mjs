// How a Jev CLI reads the issue it was asked about, shared so every CLI reads one the same way:
// by number with `gh issue view`, or from stdin as `gh`'s JSON or as plain text with the title on
// the first non-blank line. A CLI calls it only after the client's `available()`, so a keyless run
// never calls gh or reads stdin.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

/** Runs `gh` with these arguments and returns its stdout. */
export function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

/** The first all-digit argument, the issue number, or undefined. */
export function issueNumber(args) {
  return args.find((a) => /^\d+$/.test(a));
}

/**
 * The issue as `{ title, body }`: issue `number` read with `gh issue view`, or, with no number,
 * stdin. Throws when there is neither.
 */
export function readIssue(number) {
  if (number) return JSON.parse(gh(['issue', 'view', number, '--json', 'title,body']));
  if (process.stdin.isTTY) throw new Error('give an issue number, or pipe the issue on stdin');
  return parseIssue(readFileSync(0, 'utf8'));
}

/** An issue from text: `gh`'s JSON with a `title`, or plain text with the title first, LF or CRLF. */
export function parseIssue(text) {
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed?.title === 'string') return { title: parsed.title, body: parsed.body ?? '' };
  } catch {
    // Not JSON: plain text, read below.
  }
  const [title = '', ...rest] = text.trim().split(/\r?\n/);
  return { title: title.trim(), body: rest.join('\n').trim() };
}
