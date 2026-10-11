// Every tunable number the Jev tools use, and the model they use it with, in one reviewed place
// (ADR-0002). Thresholds are calibrated against this exact model id: a new model is a deliberate
// edit here, never `jev-latest`, so its calibration cannot shift silently. Each threshold names the
// sample it came from, or says plainly that it has none, so live runs can retune it. See README.md
// beside this file.

/** The pinned System One model every Jev tool asks. */
export const MODEL = 'jev-1.13.0';

/**
 * Triage turns a Choice into the agent's recommendation at a confidence at or above this; below
 * it, the question is left open. Sample: none. An unsampled default, ported unchanged from
 * errand-knight's TRIAGE_APPLY_CONFIDENCE, which records no sample for it either. Retune it from
 * the first live triage runs here.
 */
export const TRIAGE_CONFIDENT = 0.8;

/**
 * Readiness passes a check (has acceptance criteria, names seams, a plan step covers a criterion)
 * at a Noul at or above this; below it, the check is a gap the agent fixes or raises. Sample: none.
 * A first guess, set high because a false gap costs one look and a false pass lets work start on a
 * gap. Retune it from the first live readiness runs here.
 */
export const READINESS_PASS = 0.7;

/**
 * Duplicates places each open issue on a three-level Score against the issue being checked: 0
 * different, 1 maybe, 2 same. Jev's score is a float on that scale, so these cut it into bands: at
 * or above DUPLICATES_SAME is `same`, at or above DUPLICATES_MAYBE is `maybe`, and both are listed
 * for the agent to decide; below is `different`. Sample: none. First guesses, at the midpoints
 * between levels, as rounding to the nearest level would give. Retune them from the first live
 * duplicates runs here.
 */
export const DUPLICATES_MAYBE = 0.5;
export const DUPLICATES_SAME = 1.5;

/**
 * How much of each open issue's body duplicates puts in its question, in characters; the rest is
 * cut. A size limit, not a threshold: about 1,300 tokens at JEV_CHARS_PER_TOKEN, so many open
 * issues pack into one request. Sample: none.
 */
export const DUPLICATES_BODY_CHARS = 4_000;

// Jev's context limits, not thresholds: a request holds at most 64k tokens, and its state plus its
// longest single question at most 32k. Source: the TypeSafe docs as errand-knight's constants
// recorded them on 2026-10-11; not re-checked against the docs for this repo.
export const JEV_REQUEST_TOKENS = 64_000;
export const JEV_QUESTION_TOKENS = 32_000;

/**
 * Characters per token for sizing a request without a tokenizer. Sample: none. Ported unchanged
 * from errand-knight, on the rule of thumb that English prose runs nearer 4; 3 overestimates, so a
 * batch the estimate accepts should fit the real limits. No tokenizer has been run against it.
 */
export const JEV_CHARS_PER_TOKEN = 3;

// Retry and timeout settings. Sample: none; design defaults chosen for this repo, not measured.

/** Attempts per request, the first included, when Jev answers 429 (rate limit) or 529 (busy). */
export const JEV_MAX_ATTEMPTS = 4;

/** The first backoff before a retry, in milliseconds; each later one doubles it. */
export const JEV_BACKOFF_MS = 500;

/** How long one attempt may take before it is abandoned as an error, in milliseconds. */
export const JEV_TIMEOUT_MS = 30_000;
