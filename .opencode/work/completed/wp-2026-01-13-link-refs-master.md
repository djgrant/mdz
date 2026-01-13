# Link-Based References v0.8 - Master Work Package

## Goal

Implement link-based references for MDZ, replacing sigil-based syntax (`@`, `~`, `#`, `!`) with path-based links (`~/agent/x`, `~/skill/x`, `#section`).

## Measures of Success

1. All specs updated and internally consistent
2. Parser recognizes new link syntax
3. Compiler validates file existence
4. LSP provides path completion and go-to-definition
5. All examples migrated and compile cleanly
6. All tests pass
7. Website documentation updated

## Strategy

Sequential execution with validation gates:

```
Spec → Lexer → AST → Parser → Compiler → LSP → Examples → Website → Tests
```

Each phase must pass validation before proceeding.

## Work Packages

| # | Package | Status | Agent | Notes |
|---|---------|--------|-------|-------|
| 1 | link-refs-spec | pending | - | - |
| 2 | link-refs-lexer | pending | - | - |
| 3 | link-refs-ast | pending | - | - |
| 4 | link-refs-parser | pending | - | - |
| 5 | link-refs-compiler | pending | - | - |
| 6 | link-refs-lsp | pending | - | - |
| 7 | link-refs-examples | pending | - | - |
| 8 | link-refs-website | pending | - | - |
| 9 | link-refs-tests | pending | - | - |

## Progress Log

### 2026-01-13

- Master work package created
- 9 implementation work packages ready in todo/

## Results

*To be updated as work progresses*

## Evaluation

*To be completed at end of project*
