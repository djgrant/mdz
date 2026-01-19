# Parser Syntax & Keyword Fixes

## Goal
Fix syntax mismatches and keyword ordering bugs in the parser and lexer.

## Scope
- `packages/core/src/parser/parser.ts`
- `packages/core/src/parser/lexer.ts`
- `packages/core/src/parser/ast.ts`

## Tasks
1. **AWAIT $handle support**
   - Update `parseDelegateStatement()` to support `AWAIT $handle` (variable reference) without requiring the `DELEGATE` keyword.
   - If `AWAIT` is followed by a variable reference, produce a `DelegateStatement` with `awaited: true` and `task` as the variable reference (or update AST to accommodate).
   - *Alternative:* Create a separate `AwaitStatement` if it's cleaner, but `DelegateStatement` already has the field.

2. **Fix Keyword Ordering in `parseBlock()`**
   - Remove `USE`, `EXECUTE`, `GOTO`, `DELEGATE` from the `Delegation` pre-check in `parseBlock()`.
   - Ensure these keywords always trigger their specific statement parsers (`parseUseStatement`, etc.).

3. **Cleanup Lexer**
   - Delete the unused `tryScanAnchor()` method in `lexer.ts`.

## Validation
- Add tests for `AWAIT $handle`.
- Add tests for `USE`, `EXECUTE`, `GOTO` at the start of lines to ensure they don't trigger `Delegation` errors.
- Ensure all existing tests pass.
