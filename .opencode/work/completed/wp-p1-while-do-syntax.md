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

- [x] Parser accepts `WHILE condition DO:`
- [x] Parser rejects old `WHILE (condition):` syntax
- [x] All examples updated
- [x] All docs updated
- [x] All tests pass

## Results

### Changes Made

**Core Parser (packages/core/src/parser/)**
- `lexer.ts`: Added `DO` token type and keyword mapping
- `parser.ts`: Updated `parseWhile()` to expect `DO` instead of `LPAREN`/`RPAREN`
- `parser.ts`: Added `DO` as condition terminator in `parsePrimaryCondition()`

**Specifications (spec/)**
- `grammar.md`: Updated WHILE grammar to `WHILE condition DO colon`, added `DO` keyword, updated examples and parentheses requirements table
- `language-spec.md`: Updated WHILE section, Quick Reference table, Grammar Summary, Terminology, and Grouping section

**Examples (examples/)**
- `the-scientist.mdz`: Updated WHILE syntax from `WHILE (...)` to `WHILE ... DO:`

**Website (website/src/pages/docs/)**
- `control-flow.astro`: Updated WHILE examples and descriptions
- `syntax.astro`: Updated WHILE examples and descriptions
- `playground.astro`: Updated example scenario and Monaco tokenizer keywords

**Tests (tests/)**
- `parser.test.ts`: Updated 3 WHILE tests
- `v02-features.test.ts`: Updated 4 WHILE tests
- `edge-cases.test.ts`: Updated 2 WHILE tests  
- `integration.test.ts`: Updated 1 WHILE test
- `compiler.test.ts`: Updated 1 WHILE test

### Test Results

All 163 tests pass:
- Parser Tests: 44 passed
- Compiler Tests: 34 passed
- Integration Tests: 22 passed
- Edge Cases Tests: 32 passed
- v0.2 Feature Tests: 31 passed

### Syntax Change Summary

**Before:**
```mdz
WHILE (condition):
  - body
```

**After:**
```mdz
WHILE condition DO:
  - body
```

The new syntax:
- Is consistent with IF/THEN syntax
- Uses `DO` keyword as delimiter (like `THEN` for `IF`)
- No longer requires parentheses
- Allows natural semantic conditions like `WHILE NOT diminishing returns DO:`
