---
size: xl
category: language
---

# Macro System

## Goal/Problem

Implement build-time macro expansion (`{{IF}}`) for clean, single-path outputs.

**Reference:** ROADMAP.md Section 2 - Macro System

## Scope

- `src/lexer/lexer.ts` - new tokens
- `src/parser/parser.ts` - macro parsing
- `src/compiler/compiler.ts` - expansion logic

## Approach

1. Add `{{` and `}}` tokens to lexer
2. Parse macro constructs (IF, FOR EACH)
3. Implement branch pruning when values known at build time
4. Implement variant file generation when values unknown

## Open Questions

- How do variants get named?
- How does runtime know which variant to load?
- Should macros support loops?

## Hypothesis

Macros enable configuration-driven skill variants without runtime complexity.

## Results

{To be filled out upon completion}

## Evaluation

{Is this the right abstraction? Do users understand macro vs runtime distinction?}
