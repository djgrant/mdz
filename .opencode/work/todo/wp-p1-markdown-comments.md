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

- [ ] Spec documents `<!-- -->` as comment syntax
- [ ] No `#` comments remain in examples
- [ ] Docs updated
- [ ] Files remain valid Markdown

## Results

{To be filled out upon completion}
