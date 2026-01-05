---
size: md
category: language
---

# WHILE DO Syntax

## Goal/Problem

Current WHILE syntax is inconsistent with IF:
- `IF condition THEN:`
- `WHILE (condition):`

Should be consistent:
- `IF condition THEN:`
- `WHILE condition DO:`

## Current State

```mdz
WHILE (NOT diminishing returns AND $iteration < $maxIterations):
  - Do something
```

## Target State

```mdz
WHILE NOT diminishing returns AND $iteration < $maxIterations DO:
  - Do something
```

## Scope

- `packages/core/src/parser/lexer.ts` - Add DO token
- `packages/core/src/parser/parser.ts` - Change parseWhile to use DO instead of parens
- `spec/grammar.md` - Update WHILE grammar
- `spec/language-spec.md` - Update WHILE documentation
- `examples/*.mdz` - Update all WHILE usage
- `website/src/pages/docs/control-flow.astro` - Update docs
- `website/src/pages/docs/syntax.astro` - Update docs
- `website/src/pages/playground.astro` - Update scenarios
- `tests/*.test.ts` - Update tests

## Implementation

1. Add `DO` token to lexer (alongside existing keywords)
2. Change `parseWhile()`:
   ```typescript
   // Before
   this.expect('LPAREN');
   const condition = this.parseCondition();
   this.expect('RPAREN');
   
   // After
   const condition = this.parseCondition();
   this.expect('DO');
   ```
3. Update grammar: `while_stmt = WHILE condition DO colon newline block_body`
4. Update all examples and docs
5. Run tests

## Acceptance Criteria

- [ ] Parser accepts `WHILE condition DO:`
- [ ] Parser rejects old `WHILE (condition):` syntax
- [ ] All examples updated
- [ ] All docs updated
- [ ] All tests pass

## Results

{To be filled out upon completion}
