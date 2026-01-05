---
size: md
category: language
---

# Implement Semantic Marker Syntax (Master)

## Decision Summary

Replace `{~~thing~~}` with `/thing/` syntax for semantic markers, and add `$/name/` for inferred variables.

### New Syntax

**Semantic Markers:** `/thing/`
```mdz
Store at /appropriate location/
IF /file contains logic changes/ THEN:
```

**Inferred Variables:** `$/name/`
```mdz
FOR EACH $item IN $list:
  Log $/index/: $item
```

**Declared Semantic Types:** `$var: /description/ = value`
```mdz
$iteration: /loop counter/ = 0
```

## Rationale

- `{~~}` was redundant - braces implied interpolation but did nothing
- `~~` conflicts with Markdown strikethrough
- `/thing/` is clean, distinctive, and regex-evocative
- `$/name/` unifies variable sigil with semantic marker syntax

## Sub-Work Packages

| WP | Status | Description |
|----|--------|-------------|
| wp-semantic-1-spec | pending | Update grammar.md and language-spec.md |
| wp-semantic-2-lexer | pending | Update lexer for new tokens |
| wp-semantic-3-parser | pending | Update parser for new AST nodes |
| wp-semantic-4-compiler | pending | Update compiler validation |
| wp-semantic-5-examples | pending | Update all example files |
| wp-semantic-6-tests | pending | Update/add tests |
| wp-semantic-7-docs | pending | Update website documentation |

## Acceptance Criteria

- All tests pass with new syntax
- Examples compile without errors
- Documentation reflects new syntax
- No `{~~` syntax remains in codebase
- Editor syntax highlighting updated

## Results

{Progress updates recorded here}

## Evaluation

{Final assessment upon completion}
