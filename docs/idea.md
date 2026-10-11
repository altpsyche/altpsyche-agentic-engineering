# <Project>

<!-- TEMPLATE: the product source of truth. Fill each section with /grill-with-docs, then delete
this comment. Keep the `## N. Roadmap` heading and its `### Phase N — Title` subheadings in this
shape: `scripts/jev/triage.mjs` and `/work` read them, and the phase:N labels mirror them. -->

## 1. Vision

<What this is and why it should exist, in a paragraph.>

## 2. Product Principles

- <A principle the product will not trade away.>

## 3. Core Concepts

<The domain vocabulary. Each term once, with what it is and is not. `/domain-modeling` moves these
into `GLOSSARY.md` as they are resolved.>

## 4. MVP Scope

### MVP Features

- <Feature.>

### Explicit Non-Goals for MVP

- <Non-goal.>

## 5. Technical Architecture

### Stack

| Layer | Choice |
|---|---|
| <Layer> | <Choice> |

### Modules

<One line per module: what it owns. Adding a module requires an ADR.>

## 6. Roadmap

### Phase 0 — Foundation

- Workspace scaffold, build, and `pnpm verify` extended with the stack's checks
- CI running every check `pnpm verify` runs

### Phase 1 — First vertical slice

- <The thinnest end-to-end path that proves the core loop.>

## 7. Success Criteria

- <How we know it worked.>

## 8. Open Questions

- <A question not yet decided. When decided, it becomes an ADR and leaves this list.>
