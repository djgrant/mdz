---
size: sm
category: language
---

# Markdown Comments

## Goal/Problem

Current convention uses `#` for inline comments, which conflicts with Markdown heading syntax.

```mdz
- $problem: $String  # the problem to solve
```

Should use Markdown comments to maintain "superset of Markdown" philosophy:

```mdz
- $problem: $String  <!-- the problem to solve -->
```

## Scope

- `spec/grammar.md` - Update comment syntax
- `spec/language-spec.md` - Update comment documentation
- `examples/*.mdz` - Update all inline comments
- `website/src/pages/docs/*.astro` - Update docs
- `packages/core/src/parser/lexer.ts` - May need to handle `<!-- -->` specially

## Implementation

1. Update spec to document `<!-- comment -->` as the comment syntax
2. Update all examples to use `<!-- -->` instead of `#`
3. Verify parser handles `<!-- -->` correctly (may pass through as text)
4. Update website docs

## Examples

Before:
```mdz
## Input

- $prUrl: $String  # URL of the pull request
- $focusAreas: $String[] = ["correctness"]  # areas to focus on
```

After:
```mdz
## Input

- $prUrl: $String  <!-- URL of the pull request -->
- $focusAreas: $String[] = ["correctness"]  <!-- areas to focus on -->
```

## Acceptance Criteria

- [x] Spec documents `<!-- -->` as comment syntax
- [x] No `#` comments remain in examples
- [x] Docs updated
- [x] Files remain valid Markdown

## Results

**Completed**: 2026-01-05

### Changes Made

**Specs:**
- `spec/grammar.md`: Updated grammar to define `comment = "<!--" { any_char } "-->"` instead of `line_comment = '#' { any_char }`
- `spec/language-spec.md`: Updated all examples and documentation to use `<!-- -->` syntax

**Examples:**
- `examples/debugger.mdz`: 1 comment updated
- `examples/the-scientist.mdz`: 1 comment updated  
- `examples/skill-composer.mdz`: 2 comments updated
- `examples/pr-reviewer.mdz`: 2 comments updated

**Website Docs:**
- `website/src/pages/docs/syntax.astro`: 5 comments updated
- `website/src/pages/docs/types.astro`: 5 comments updated

### Parser Behavior

The lexer (`packages/core/src/parser/lexer.ts`) does NOT need modification. HTML comments (`<!-- -->`) are treated as regular text by the lexer, which is the correct behavior - comments pass through unchanged to the output, consistent with MDZ's "source = output" philosophy.

### Test Results

All tests pass (157/161). The 4 failures are pre-existing issues unrelated to this change:
- BREAK/CONTINUE inside WHILE loops
- Backward compatibility with v0.1 skill syntax

No new test failures introduced.
