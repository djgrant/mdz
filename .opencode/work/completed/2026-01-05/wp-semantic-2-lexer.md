---
size: sm
category: language
parent: wp-p1-semantic-marker-syntax
---

# Update Lexer for Semantic Marker Syntax

## Goal/Problem

Update the lexer to tokenize the new `/thing/` and `$/name/` syntax.

## Scope

- `packages/core/src/parser/lexer.ts`

## Approach

### Token Changes

1. Remove or repurpose:
   - `SEMANTIC_OPEN` (was `{~~`)
   - `SEMANTIC_CLOSE` (was `}`)
   - `SEMANTIC_CONTENT`

2. Add new tokens:
   - `SEMANTIC_MARKER` - captures `/content/` as single token
   - `INFERRED_VAR` - captures `$/name/` as single token

### Lexer Logic

1. When encountering `/`:
   - If preceded by `$`, scan as inferred variable `$/name/`
   - Otherwise, check if it's a semantic marker vs division/path
   - Disambiguation: semantic markers contain spaces/prose, paths don't

2. Scan until closing `/` (same line only)

3. Handle edge cases:
   - `$/index/` - inferred variable
   - `/appropriate location/` - semantic marker
   - `/path/to/file` - NOT a semantic marker (no spaces, looks like path)

### Disambiguation Heuristic

A `/` starts a semantic marker if:
- It's followed by content containing spaces before the next `/`
- OR it's immediately after `$` (inferred variable)

## Hypothesis

The main complexity is disambiguating `/semantic marker/` from file paths. The "contains spaces" heuristic should work for most cases.

## Results

### Token Type Changes

Added two new token types to `TokenType`:
- `SEMANTIC_MARKER` - for `/content with spaces/`
- `INFERRED_VAR` - for `$/name/`

Kept legacy tokens for backward compatibility:
- `SEMANTIC_OPEN`, `SEMANTIC_CLOSE`, `SEMANTIC_CONTENT` - still work for `{~~content}`

### Implementation

1. **`scanDollarIdent()`** - Updated to detect `$/` and scan inferred variables
2. **`tryPeekSemanticMarker(stopChar?)`** - Lookahead to check if `/` starts a semantic marker
3. **`scanSemanticMarkerContent()`** - Consumes and tokenizes `/content/`
4. **`tryScanSemanticMarker()`** - Combines peek + scan for main token loop
5. **`scanTemplate()`** - Updated to handle both `$/name/` and `/content/` inside templates

### Disambiguation

The heuristic works correctly:
- `/appropriate location/` → SEMANTIC_MARKER (contains space)
- `/path/to/file` → NOT tokenized as semantic (no spaces)
- `$/index/` → INFERRED_VAR (always, regardless of spaces)

### Test Results

All 169 existing tests pass. Manual verification:
- `/appropriate location/` → `SEMANTIC_MARKER="/appropriate location/"`
- `/path/to/file` → no semantic marker tokens
- `$/index/` → `INFERRED_VAR="$/index/"`
- Multiple markers in one line work
- Template literals handle both new token types
- Legacy `{~~}` syntax still works

## Evaluation

✅ Lexer correctly tokenizes all semantic marker patterns with proper disambiguation
