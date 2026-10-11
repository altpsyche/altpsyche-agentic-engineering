// The evidence checker: for each claim in a PR body's `## Evidence`, checks the quoted result line
// exactly against the output the Reviewer's own run of that command printed, then asks Jev whether
// the output supports the criterion. It flags or notes; it never decides. The Reviewer still checks
// every entry and owns every finding. See README.md beside this file and docs/agents/jev.md.
//
// It never runs a command it reads: the PR body is untrusted text (docs/agents/issue-tracker.md
// § Untrusted text), so the Reviewer runs each command and hands in what it printed.

import { errorLine, fitsBesideState } from './client.mjs';
import { EVIDENCE_SUPPORTS_CONFIDENT } from './constants.mjs';

// The options, in this order on purpose: Jev favours the first option (ADR-0002), so its bias lands
// on a flag, the cheap mistake, never on a note.
const OPTIONS = {
  contradicts: 'The output shows the criterion is not met: a failure, an error, or a result opposite to what the criterion needs.',
  silent: 'The output neither shows the criterion met nor shows it unmet: it is about something else, or says too little to tell.',
  supports: 'The output, including the quoted result line, shows the criterion is met.',
};

const STATE = {
  task: 'Each question is one claim from the evidence section of a pull request: an acceptance criterion, the command run to prove it, the result line quoted from its output, and the full output that command printed.',
};

const ARROW = /\s(?:→|->)\s?/;

// Markdown code spans, any number of backticks, with one padding space stripped from each end.
function codeSpans(text) {
  const spans = [];
  const re = /(`+)([\s\S]*?[^`])\1(?!`)/g;
  for (let m; (m = re.exec(text)); ) {
    const inner = m[2];
    spans.push(/^ .* $/.test(inner) ? inner.slice(1, -1) : inner);
  }
  return spans;
}

/** What a claim's result says to look for: a quoted line, an empty output, or nothing usable. */
function expectation(result) {
  const [span] = codeSpans(result);
  if (span !== undefined) return { quote: span };
  const quoted = /"([^"]+)"/.exec(result);
  if (quoted) return { quote: quoted[1] };
  if (/^\s*prints nothing\b/i.test(result)) return { nothing: true };
  return null;
}

/**
 * The claims in a PR body's `## Evidence` section, in order, per **Evidence** in
 * docs/agents/issue-tracker.md: each top-level bullet is an entry naming its criterion in bold, and
 * each `command` → result line in it is one claim. An entry with no such line is one claim with no
 * command. Ids run E1, E2, … over the claims.
 *
 * @returns {Array<{ id: string, criterion: string, command: string | null,
 *   expect: { quote: string } | { nothing: true } | null }>}
 */
export function parseEvidence(body) {
  const entries = [];
  let inSection = false;
  for (const line of String(body ?? '').split('\n')) {
    if (/^#{1,2}\s/.test(line)) {
      inSection = /^##\s+Evidence\s*$/i.test(line.trim());
      continue;
    }
    if (!inSection) continue;
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    let rest = line;
    if (bullet) {
      const bold = /^\*\*(.+?)\*\*/.exec(bullet[1]);
      const criterion = (bold ? bold[1] : bullet[1].split(ARROW)[0]).trim();
      entries.push({ criterion, lines: [] });
      rest = bold ? bullet[1].slice(bold[0].length) : bullet[1];
    }
    if (entries.length && ARROW.test(rest)) entries.at(-1).lines.push(rest);
  }

  const claims = [];
  for (const { criterion, lines } of entries) {
    if (!lines.length) claims.push({ criterion, command: null, expect: null });
    for (const line of lines) {
      const [left, ...right] = line.split(ARROW);
      const [command = left.trim()] = codeSpans(left);
      claims.push({ criterion, command, expect: expectation(right.join(' → ')) });
    }
  }
  return claims.map((claim, index) => ({ id: `E${index + 1}`, ...claim }));
}

/** Output as a person reads it in a terminal: no colour codes, Unix line ends. */
function clean(output) {
  // eslint-disable-next-line no-control-regex
  return output.replace(/\u001b\[[0-9;?]*[A-Za-z]/g, '').replace(/\r\n?/g, '\n');
}

function matches(expect, output) {
  return 'nothing' in expect ? output.trim() === '' : output.includes(expect.quote);
}

function question({ criterion, command, expect }, output) {
  const quoted = 'nothing' in expect ? '(the claim is that the command prints nothing)' : expect.quote;
  return {
    type: 'choice',
    instructions:
      `Criterion: ${criterion}\nCommand: ${command}\nQuoted result line: ${quoted}\n` +
      `Output the command printed:\n${output}\n\nRead the output. Does it show the criterion is met?`,
    criteria: OPTIONS,
  };
}

function judge(answer, id) {
  if (!answer || typeof answer.choice !== 'string' || typeof answer.confidence !== 'number') {
    throw new Error(`Jev returned no usable answer for ${id}`);
  }
  if (!Object.hasOwn(OPTIONS, answer.choice)) throw new Error(`Jev chose ${answer.choice} for ${id}, which is not an option`);
  const noted = answer.choice === 'supports' && answer.confidence >= EVIDENCE_SUPPORTS_CONFIDENT;
  return { decision: noted ? 'note' : 'flag', reason: answer.choice, confidence: answer.confidence };
}

function validOutputs(outputs) {
  if (typeof outputs !== 'object' || outputs === null || Array.isArray(outputs)) {
    throw new Error('the outputs are not a JSON object of { "<command>": "<what it printed>" }');
  }
  for (const [command, output] of Object.entries(outputs)) {
    if (typeof output !== 'string') throw new Error(`the output of \`${command}\` is not a string`);
  }
  return outputs;
}

const WHY = {
  'no-quote': 'no quoted result',
  'no-output': 'no output given for its command',
  'not-in-output': 'quoted result not in the output',
  'too-large': 'output too large to ask about',
};

/** The CLI's line output: flagged claims first, then noted ones, each in Evidence order. */
export function human(result) {
  if (result.status !== 'ok') return `jev evidence: ${result.status}, ${result.reason}; check every entry yourself`;
  const line = (c) => {
    const why = WHY[c.reason] ?? `${c.reason}, confidence ${c.confidence.toFixed(2)}`;
    return `${c.id}: ${c.decision} (${why}) - ${c.criterion}${c.decision === 'flag' ? '; check it first' : ''}`;
  };
  const flags = result.claims.filter((c) => c.decision === 'flag');
  const notes = result.claims.filter((c) => c.decision !== 'flag');
  return [...flags, ...notes].map(line).join('\n');
}

/**
 * Check a PR's Evidence claims against the output of their commands.
 *
 * @param {{ body: string, outputs: Record<string, string> }} input  the PR body, and what each
 *   command printed when the Reviewer ran it, keyed by the command as the claim writes it
 * @param {{ client: { available(): Promise<object>, ask(request): Promise<object> } }} deps
 * @returns one of
 *   { status: 'ok', claims: Claim[] }, every claim in Evidence order, Claim = { id, criterion,
 *     command, decision: 'note' | 'flag', reason, confidence? }, reason one of 'no-quote',
 *     'no-output', 'not-in-output', 'too-large' (unasked) or the Choice Jev made
 *   { status: 'skipped', reason }  no key
 *   { status: 'error', reason }    anything else, including malformed input; never thrown
 */
export async function run(input, { client }) {
  try {
    // Before any other work, so a keyless run skips even on input it cannot read.
    const ready = await client.available();
    if (ready.status !== 'ok') return ready;
    const claims = parseEvidence(input?.body);
    if (!claims.length) return { status: 'error', reason: 'the PR body has no ## Evidence entries' };
    const outputs = validOutputs(input.outputs);

    const verdicts = new Map();
    const questions = {};
    for (const claim of claims) {
      const unasked = (reason) => verdicts.set(claim.id, { decision: 'flag', reason });
      if (!claim.command || !claim.expect) unasked('no-quote');
      else if (!Object.hasOwn(outputs, claim.command)) unasked('no-output');
      else {
        const output = clean(outputs[claim.command]);
        const ask = question(claim, output);
        if (!matches(claim.expect, output)) unasked('not-in-output');
        else if (!fitsBesideState(STATE, claim.id, ask)) unasked('too-large');
        else questions[claim.id] = ask;
      }
    }

    if (Object.keys(questions).length) {
      const result = await client.ask({ state: STATE, questions });
      if (result.status !== 'ok') return { status: result.status, reason: result.reason };
      for (const id of Object.keys(questions)) verdicts.set(id, judge(result.answers[id], id));
    }

    return {
      status: 'ok',
      claims: claims.map(({ id, criterion, command }) => ({ id, criterion, command, ...verdicts.get(id) })),
    };
  } catch (error) {
    return { status: 'error', reason: errorLine(error) };
  }
}
