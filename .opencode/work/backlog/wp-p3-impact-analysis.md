---
size: sm
category: tooling
---

# Impact Analysis Tooling

## Goal/Problem

Reverse dependency lookup: "What skills depend on X?"

**Reference:** ROADMAP.md Section 3 - Dependency Graph remaining opportunities

## Scope

- `src/compiler/compiler.ts`
- `src/cli/index.ts`

## Approach

1. Implement `getDependents(skillName)` function
2. Add CLI command: `mdz impact <skill>`
3. Show transitive dependents
4. Integrate with graph visualization

## Hypothesis

Impact analysis helps assess risk of changes.

## Results

{To be filled out upon completion}

## Evaluation

{Is this used? Does it prevent breaking changes?}
