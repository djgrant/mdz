# Parser Lexer Fixes

## Goal
Fix high-priority lexer and parser issues regarding code blocks, template interpolation, and span calculations.

## Scope
- `packages/core/src/parser/Lexer.ts` (or similar)
- `packages/core/src/parser/Parser.ts` (or similar)

## Tasks
1. **Lexer - Code Blocks & Blockquotes**
   - In `scanToken()`, add start-of-line checks for ` ``` ` and `>`.
   - Ensure they call `scanCodeBlock()` and `scanBlockquote()` respectively.
   - Verify `column === 0`.

2. **Lexer - Template Interpolation**
   - Fix `scanTemplate()` handling of `${...}`.
   - Restrict to variables + inferred vars only (Option 1 from analysis).
   - Ensure `${foo}` emits `DOLLAR_IDENT` with value `"$foo"`.

3. **Parser - Span Calculations**
   - In `parseVariableReference()`, merge spans using the accumulated `expr.span` instead of `varToken.span`.
   - Fix FunctionCall span merging to use `expr.span` with closing paren span.

## Validation
- Create/Run tests for code blocks and blockquotes to ensure they are tokenized correctly.
- Create/Run tests for template interpolation.
- Create/Run tests for chained variable access/calls to verify spans.
