# Fix Type Syntax (: not =)

## Goal/Problem

All type assignment references should use `:` not `=` for consistency with the language spec.

## Scope

- Documentation examples
- Website code samples
- Test fixtures
- Any sample .mdz files

## Approach

1. Search for patterns like `$var = $Type` that should be `$var: $Type`
2. Review each occurrence for context
3. Fix and verify examples still make sense

## Hypothesis

Consistent syntax in examples reduces confusion for new users.

## Results

**No fixes needed.** The codebase is already consistent.

### Audit Findings

Searched for the problematic pattern `$var = $Type` (variable declaration using `=` instead of `:` for type annotation). Found no instances.

**Current syntax is correct:**

1. **Type definitions** use `=` (intentional):
   ```
   $Task = any task that an agent can execute
   $Strategy = "fast" | "thorough"
   ```

2. **Variable declarations** use `:` for type annotation and `=` for default value (intentional):
   ```
   - $task: $Task
   - $strategy: $Strategy = "fast"
   ```

3. **Function type definitions** use `=` with arrow syntax (intentional):
   ```
   $PathGenerator = $n => `output-{$n}.md`
   ```

### Files Verified

- `spec/language-spec.md` - ✓ Correct syntax
- `spec/grammar.md` - ✓ Correct syntax
- `README.md` - ✓ Correct syntax
- `website/src/pages/docs/types.astro` - ✓ Correct syntax
- `examples/the-scientist.mdz` - ✓ Correct syntax
- `examples/debugger.mdz` - ✓ Correct syntax
- `examples/skill-composer.mdz` - ✓ Correct syntax
- All test files - ✓ Correct syntax

## Evaluation

The WP was based on a concern that may have been resolved already, or was never actually an issue. The codebase demonstrates consistent and correct usage of `:` for type annotations and `=` for type definitions and default values.
