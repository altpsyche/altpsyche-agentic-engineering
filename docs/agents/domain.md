# Domain docs

How the engineering skills consume this project's domain documentation. This repo is
**single-context**.

## Before exploring, read these

- **[`AGENTS.md`](../../AGENTS.md)** — conventions, anti-patterns, the ADR index, and the precedence
  order to apply when sources disagree.
- **[`docs/idea.md`](../idea.md) § Core Concepts** — the authoritative vocabulary until
  `GLOSSARY.md` exists.
- **`GLOSSARY.md`** at the repo root, *if it exists*. It is created lazily by `/domain-modeling` the
  first time a term is resolved. If it does not exist, **proceed silently**: do not flag its absence
  and do not create it upfront.
- **[`docs/adr/`](../adr/)** — read the ADRs that touch the area you are about to work in.
- **The co-located `.md`** beside the code you touch, which describes how that module works.
- **[`docs/specs/`](../specs/)** — what was agreed to be built, and its testing seams.

## Use the glossary's vocabulary

When your output names a domain concept (an issue title, a test name, a type name), use the term as
`docs/idea.md` § Core Concepts and the code define it. Do not drift to synonyms. If a synonym is
genuinely better, `/domain-modeling` changes the model and the vocabulary together, in one commit.

<!-- TEMPLATE: once terms settle, list the distinctions agents most often blur here, e.g.
- **Term A** vs **Term B** — what separates them. Never "synonym". -->

## Flag conflicts

If your output contradicts an ADR or a decided constraint, say so explicitly rather than silently
overriding it:

> _Contradicts ADR-0002 (Jev stays in dev tooling), but worth reopening because…_

Under `AGENTS.md`, adding a module requires an ADR, and an ADR outranks code docs and `AGENTS.md`.
