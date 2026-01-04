---
size: md
category: tooling
---

# Cross-Skill Type Consistency Checking

## Goal/Problem

When skill A references skill B and passes a `$Task` type, ensure definitions are compatible.

**Reference:** ROADMAP.md Section 1 - Tooling Refactor remaining opportunities

## Scope

- `src/compiler/compiler.ts`
- Registry/multi-file validation

## Approach

1. Build type registry across skills
2. Compare type definitions when skills interact
3. Warn on incompatible definitions
4. Consider structural vs nominal typing

## Hypothesis

Cross-skill type checking prevents subtle integration bugs.

## Results

{To be filled out upon completion}

## Evaluation

{Is this valuable? Does it catch real issues?}
