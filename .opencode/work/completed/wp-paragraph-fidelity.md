# Paragraph Text Fidelity

## Goal
Preserve punctuation and spacing in paragraphs by using source offset slicing instead of token joining.

## Scope
- `packages/core/src/parser/parser.ts`

## Tasks
1. **Refactor `parseInlineText()`**
   - Instead of joining token values with spaces, determine the start and end offsets of the continuous text segment.
   - Use `this.source.slice(startOffset, endOffset)` to get the raw text.
   - Ensure it still handles stopping at links, variables, etc.

2. **Verify Paragraph assembly**
   - Ensure `Paragraph` nodes correctly represent the original source text fidelity.

## Validation
- Add tests with complex punctuation and irregular spacing (e.g., `word , word` vs `word, word`) to ensure they are preserved exactly as in source.
