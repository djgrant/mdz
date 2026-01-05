---
size: sm
category: language
parent: wp-p1-semantic-marker-syntax
---

# Update Compiler for Semantic Marker Syntax

## Goal/Problem

Update the compiler validation to handle new semantic marker and inferred variable AST nodes.

## Scope

- `packages/core/src/compiler/compiler.ts`

## Approach

### Validation Changes

1. Update symbol collection:
   - `InferredVariable` nodes should NOT be flagged as undeclared
   - They are intentionally unresolved (LLM infers them)

2. Update scope validation:
   - `$/name/` is always valid (no declaration needed)
   - `$var: /description/` declares a variable with semantic type

3. Update reference validation:
   - Semantic markers (`/thing/`) may contain `$var` references
   - These should still be validated against scope

4. Update type validation:
   - `/description/` is a valid type annotation (semantic type)
   - Equivalent to current prose type definitions

### Error Code Changes

- Remove/update E003 (was "Unclosed semantic marker" for `{~~`)
- Add validation that `/` markers are properly closed

## Hypothesis

Compiler changes are mostly removing old validation and ensuring inferred variables bypass undeclared-variable checks.

## Results

### Changes Made

Updated `packages/core/src/compiler/compiler.ts` with the following:

1. **`extractFromParagraph`** (line 409-431):
   - Added handling for `InferredVariable` nodes in paragraphs
   - Creates source map entries with type `'semantic'` for `$/name/` syntax
   - Added comment explaining these are intentionally unresolved

2. **`extractFromExpression`** (line 476-491):
   - Added case for `InferredVariable` in expression extraction
   - Creates source map entries similar to `SemanticMarker`
   - Added comment documenting the design intent

3. **`checkScopeInBlocks`** (line 636-657):
   - Added handling for `SemanticMarker.interpolations`
   - Validates `$var` references inside semantic markers against scope
   - Added comment explaining that `InferredVariable` nodes are intentionally skipped

4. **`checkExpressionScope`** (line 665-693):
   - Added explicit case for `InferredVariable` - does nothing (by design)
   - Added case for `SemanticMarker` to validate its interpolations
   - Added comments documenting why inferred variables bypass scope checks

### Key Design Decisions

- `InferredVariable` (`$/name/`) nodes are NEVER flagged as undeclared - this is by design
- Regular `$var` references inside `SemanticMarker.interpolations` ARE validated against scope
- Source map entries use type `'semantic'` for both `SemanticMarker` and `InferredVariable`

### Test Results

All 169 tests pass:
- Parser tests: 44/44
- Compiler tests: 34/34
- Integration tests: 22/22
- Edge cases: 32/32
- v0.2 features: 31/31
- Examples: 6/6

## Evaluation

Compiler validates new syntax correctly without false positives. The hypothesis was confirmed - changes were minimal and focused on ensuring inferred variables bypass undeclared-variable checks while still validating regular variable references inside semantic markers.
