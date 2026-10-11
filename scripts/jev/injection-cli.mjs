#!/usr/bin/env node
// CLI for the injection screen. See README.md beside this file and docs/agents/jev.md.
//
//   node scripts/jev/injection-cli.mjs <number> [--json]   a PR (`gh pr view`), else an issue
//   gh issue view 7 --json title,body,comments | node scripts/jev/injection-cli.mjs [--json]
//   node scripts/jev/injection-cli.mjs [--json] < text.txt   first non-blank line is the title
//
// Prints one line per text, `clear`, `uncertain` or `hit`, then a summary line.
// Always exits 0: a skip or an error is one line, and the agent reads the text as it would anyway.

import { readFileSync } from 'node:fs';
import { createClient, errorLine } from './client.mjs';
import { human, run } from './injection.mjs';
import { gh, issueNumber, parseIssue } from './issue-input.mjs';

const args = process.argv.slice(2);
const json = args.includes('--json');
const number = issueNumber(args);

// `gh` gives each comment and review an `author` object; piped JSON may give a plain login.
function work({ title, body, comments, reviews }) {
  const texts = (list) => (list ?? []).map((c) => ({ author: c?.author?.login ?? c?.author, body: c?.body }));
  return { title: String(title ?? ''), body: String(body ?? ''), comments: texts(comments), reviews: texts(reviews) };
}

function readWork() {
  if (number) {
    // Issues and PRs share one number sequence: a PR first, since it also carries reviews.
    try {
      return work(JSON.parse(gh(['pr', 'view', number, '--json', 'title,body,comments,reviews'])));
    } catch {
      return work(JSON.parse(gh(['issue', 'view', number, '--json', 'title,body,comments'])));
    }
  }
  if (process.stdin.isTTY) throw new Error('give an issue or PR number, or pipe it on stdin');
  const text = readFileSync(0, 'utf8');
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed?.title === 'string') return work(parsed);
  } catch {
    // Not JSON: plain text, read below.
  }
  return work(parseIssue(text));
}

// Check the key first: a keyless run must not call gh or read stdin.
const client = createClient();
let result = await client.available();
try {
  if (result.status === 'ok') result = await run(readWork(), { client });
} catch (error) {
  result = { status: 'error', reason: errorLine(error) };
}
console.log(json ? JSON.stringify(result) : human(result));
