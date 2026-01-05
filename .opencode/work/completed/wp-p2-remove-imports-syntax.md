# Work Package: Remove imports: Syntax

**Priority:** P2
**Status:** completed
**Created:** 2026-01-05
**Completed:** 2026-01-05

## Summary

Remove the `imports:` syntax from MDZ. The `uses:` field is sufficient for declaring skill dependencies.

## Rationale

The `imports:` syntax is superfluous since `uses:` provides the same dependency declaration capability. Removing it simplifies the language and reduces confusion.

## Changes Made

### Core Parser (`packages/core/src/parser/parser.ts`)
- Removed `parseImports()` method
- Simplified `parseYaml()` to remove imports-specific parsing
- Removed `imports` field from frontmatter return value

### AST Types (`packages/core/src/parser/ast.ts`)
- Removed `ImportDeclaration` interface
- Removed `imports` field from `Frontmatter` interface
- Removed error code `E018` (Invalid import declaration)

### Compiler (`packages/core/src/compiler/compiler.ts`)
- Removed `ImportInfo` interface
- Removed `imports` from `DocumentMetadata`
- Removed imports handling in `extractMetadata()`
- Removed 'imports' from `DependencyEdge.type` union
- Removed imports edge generation in `buildDependencyGraph()`
- Updated reference validation messages to mention only `uses:`

### Grammar Spec (`spec/grammar.md`)
- Removed `imports_field` production from frontmatter schema
- Updated complete skill example to use only `uses:`
- Added v0.4 version notes documenting the removal

### Language Spec (`spec/language-spec.md`)
- Removed Import System section
- Updated frontmatter schema example
- Updated validation messages to mention only `uses:`
- Updated terminology section (removed Import and Alias terms)
- Updated dependency graph description
- Added v0.4 version history entry

### Tests (`tests/v02-features.test.ts`)
- Removed `Extended Imports - Parsing` test suite
- Removed `Extended Imports - Compilation` test suite
- Updated integration test to use `uses:` instead of `imports:`
- Removed `imports with empty skills array` edge case test
- Updated test file header to document removal

### Website Docs
- `docs/concepts.astro` - Updated frontmatter and dependency graph descriptions
- `docs/cli.astro` - Updated `mdz graph` description
- `docs/internals.astro` - Updated AST, validation, and dependency sections
- `docs/skill-library.astro` - Updated migration path description
- `playground.astro` - Simplified edge color logic (removed imports case)
- `zen-worker-entry.ts` - Updated DependencyEdge type

## Test Results

All 163 tests pass:
- Parser tests: 44 passed
- Compiler tests: 34 passed
- Integration tests: 22 passed
- Edge case tests: 32 passed
- v0.2 feature tests: 31 passed

## Migration Notes

Skills using `imports:` syntax should migrate to `uses:`:

Before:
```yaml
imports:
  - path: "./skills/"
    skills: [simplify, work-packages]
  - path: "@mdz/stdlib"
    alias:
      orchestrate-map-reduce: omr
```

After:
```yaml
uses:
  - simplify
  - work-packages
  - orchestrate-map-reduce
```

Note: Aliases are no longer supported. Use full skill names.

## Version Impact

- Grammar version: 0.3 → 0.4
- Language spec version: 0.3 → 0.4
