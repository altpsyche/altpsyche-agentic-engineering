// Every tunable number the Jev tools use, and the model they use it with, in one reviewed place
// (ADR-0002). Thresholds are calibrated against this exact model id: a new model is a deliberate
// edit here, never `jev-latest`, so its calibration cannot shift silently. Each threshold names the
// sample it came from, so live runs can retune it. See README.md beside this file.

/** The pinned System One model every Jev tool asks. */
export const MODEL = 'jev-1.13.0';

/**
 * Triage turns a Choice into the agent's recommendation at a confidence at or above this; below
 * it, the question is left open. Sample: ported from errand-knight's TRIAGE_APPLY_CONFIDENCE,
 * calibrated there against jev-1.13.0 on its own issues. Not yet retuned on this repo.
 */
export const TRIAGE_CONFIDENT = 0.8;

// Jev's context limits, per the TypeSafe docs as of 2026-10-11: a request holds at most 64k tokens,
// and its state plus its longest single question at most 32k.
export const JEV_REQUEST_TOKENS = 64_000;
export const JEV_QUESTION_TOKENS = 32_000;

/**
 * Characters per token for sizing a request without a tokenizer. English prose runs nearer 4; 3
 * overestimates, so a batch the estimate accepts fits the real limits.
 */
export const JEV_CHARS_PER_TOKEN = 3;

/** Attempts per request, the first included, when Jev answers 429 (rate limit) or 529 (overloaded). */
export const JEV_MAX_ATTEMPTS = 4;

/** The first backoff before a retry, in milliseconds; each later one doubles it. */
export const JEV_BACKOFF_MS = 500;

/** How long one attempt may take before it is abandoned as an error, in milliseconds. */
export const JEV_TIMEOUT_MS = 30_000;
