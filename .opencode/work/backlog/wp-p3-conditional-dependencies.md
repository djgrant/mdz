---
size: sm
category: tooling
---

# Handle Conditional Dependencies

## Goal/Problem

Dependencies inside IF blocks are treated same as unconditional. Should distinguish.

**Reference:** ROADMAP.md Section 3 - Dependency Graph remaining opportunities

## Scope

- `src/compiler/compiler.ts`
- Dependency extraction logic

## Approach

1. Track AST context when extracting dependencies
2. Mark dependencies as conditional when inside control flow
3. Update graph representation
4. Update visualization to show conditional edges

## Hypothesis

Conditional dependency tracking enables smarter impact analysis.

## Results

{To be filled out upon completion}

## Evaluation

{Is the distinction useful in practice?}
