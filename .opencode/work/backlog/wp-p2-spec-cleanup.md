---
size: sm
category: language
parent: wp-p1-language-coherence-master
---

# Spec and Parser Cleanup

## Goal/Problem

The grammar audit found dead code and inconsistencies between spec and implementation. Clean these up.

## Scope

- `packages/core/src/parser/ast.ts`
- `packages/core/src/parser/lexer.ts`
- `spec/grammar.md`
- `spec/language-spec.md`

## Cleanup Tasks

### 1. Dead Code Removal (depends on delegation decision)

If delegation becomes prose-based (Option A):
- [ ] Remove `Delegation` AST type from ast.ts
- [ ] Remove `WITH` token from lexer.ts
- [ ] Update grammar.md to remove delegation grammar
- [ ] Update language-spec.md to clarify prose-based delegation

If delegation is implemented (Option B):
- [ ] Keep types but implement parsing
- [ ] (Separate work package)

### 2. Macro System Status

- [ ] Clarify in grammar.md that macros (`{{IF}}`) are not yet implemented
- [ ] Add note to ROADMAP.md about macro system status
- [ ] Ensure language-spec.md doesn't promise macro features

### 3. Version Alignment

- [ ] Ensure grammar.md and language-spec.md both say v0.3
- [ ] Changelog reflects current state

### 4. Error Code Consistency

- [ ] Review error codes in grammar.md vs actual compiler errors
- [ ] Ensure all documented errors are implemented

## Approach

1. Wait for delegation decision
2. Apply cleanup based on decision
3. Verify specs stay aligned
4. Run tests to ensure no regressions

## Hypothesis

Cleaning up dead code and aligning specs reduces confusion and maintenance burden.

## Results

{To be filled out upon completion}

## Evaluation

{Is the codebase cleaner? Are specs easier to understand?}
