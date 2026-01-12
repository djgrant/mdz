# MDZ Example Compilation Fixes

## Goal/Problem

The examples test (`tests/examples.test.ts`) reveals 4 example files that fail to compile. We need to fix these issues, which span parser bugs, language gaps, and example errors.

## Scope

- `spec/grammar.md` and `spec/language-spec.md` (language design)
- `packages/core/src/parser/` (parser fixes)
- `packages/lsp/` (LSP case sensitivity check)
- `examples/` (example file fixes)
- `tests/examples.test.ts` (verification)

## Sub-Work Packages

### WP1: Add ELSE IF construct
- **Type**: Language enhancement
- **Status**: Pending
- **Files**: spec/grammar.md, spec/language-spec.md, packages/core/src/parser/, packages/core/src/compiler/
- **Issue**: `review-format.mdz` uses `ELSE IF` which isn't in the grammar

### WP2: Fix BREAK/CONTINUE loop depth tracking
- **Type**: Parser bug fix
- **Status**: Pending  
- **Files**: packages/core/src/compiler/
- **Issue**: `adversarial-review.mdz` has BREAK inside WHILE>IF but compiler says "BREAK can only be used inside a loop"

### WP3: Update examples to valid MDZ syntax
- **Type**: Example fixes
- **Status**: Pending
- **Files**: examples/pr-reviewer/learnings.mdz, examples/skills/secret-rotation.mdz
- **Issues**: 
  - learnings.mdz uses informal `When` syntax instead of `IF...THEN`
  - secret-rotation.mdz references `[[#rollback]]` but section is `### 7. Rollback`

### WP4: Investigate WHEN/When case sensitivity
- **Type**: Investigation
- **Status**: Pending
- **Files**: packages/core/src/parser/, packages/lsp/
- **Issue**: Potential case sensitivity issue with WHEN vs When in lexer/LSP

## Approach

1. Delegate WP1 to an orchestrator sub-agent (touches spec, parser, compiler, docs)
2. Fix WP2 directly (compiler bug)
3. Fix WP3 directly (example updates)
4. Investigate WP4 (parser/LSP check)
5. Run `npx tsx tests/examples.test.ts` to verify all 20 examples pass

## Hypothesis

All issues are fixable. The ELSE IF addition is the most complex as it requires spec changes. The BREAK bug is a scoping issue in the compiler. The example fixes are straightforward.

## Results

All 4 issues have been resolved:

### WP1: ELSE IF Support (Language Enhancement)
- Added `ELSE IF` syntax to `spec/grammar.md` and `spec/language-spec.md`
- Implemented in `packages/core/src/parser/parser.ts` and `ast.ts`
- Added `ElseIfClause` interface with `condition`, `body`, `span` fields
- `IfStatement` now has `elseIf: ElseIfClause[]` array
- Added 4 new parser tests

### WP2: BREAK/CONTINUE Loop Tracking (Parser Bug)
- Fixed delegation detection in parser to handle `Delegate to [[ref]]` pattern
- Fixed WITH clause INDENT/DEDENT handling that was throwing off loop depth
- `adversarial-review.mdz` now compiles correctly

### WP3: Example Fixes
- `learnings.mdz`: Converted informal `When` syntax to `IF...THEN`, fixed `FOR EACH` missing `IN`, added missing `THEN` keywords
- `secret-rotation.mdz`: Changed `### 7. Rollback` to `## Rollback` to match `[[#rollback]]` references

### WP4: Case Sensitivity Investigation
- Confirmed lexer IS case-sensitive for keywords
- `WHEN` is not a keyword (correctly tokenized as `UPPER_IDENT`)
- No bug found - implementation is correct

### Bonus: Code Block Parsing Bug
- Fixed lexer emitting spurious `NEWLINE` tokens after `CODE_BLOCK_START`/`CODE_BLOCK_END`
- Changed `consumeNewline()` to `consumeNewlineRaw()` in two places
- `review-format.mdz` now compiles correctly

## Evaluation

**Hypothesis confirmed**: All issues were fixable.

- ELSE IF was the most complex (spec + parser + tests), but cleanly implemented
- BREAK bug was actually a delegation/indentation issue, not loop depth tracking
- Example fixes were straightforward
- Case sensitivity was a non-issue (already correct)
- Discovered and fixed an additional code block parsing bug

**Final result**: All 20 example files compile without errors (21/21 tests pass including summary).
