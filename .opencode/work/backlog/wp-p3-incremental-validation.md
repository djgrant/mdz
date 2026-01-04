---
size: md
category: tooling
---

# Incremental Validation

## Goal/Problem

Support efficient re-validation when only one file changes (vs re-validating entire project).

**Reference:** ROADMAP.md Section 1 - Tooling Refactor remaining opportunities

## Scope

- `src/compiler/compiler.ts`
- `src/lsp/server.ts`

## Approach

1. Cache validation results per file
2. Track dependencies between files
3. Invalidate only affected files on change
4. Integrate with LSP for real-time performance

## Hypothesis

Incremental validation improves IDE responsiveness for large skill libraries.

## Results

{To be filled out upon completion}

## Evaluation

{Is the performance improvement noticeable? Is the complexity worth it?}
