---
size: md
category: tooling
---

# Codebase Reorganization

## Goal/Problem

The codebase has accumulated organic cruft and inconsistencies. Examples:
- `tests/stress/edge-cases.test.ts` - misplaced, purpose forgotten
- Flat `src/` structure that should migrate to `packages/*` monorepo

Need to review the entire codebase structure, clean up inconsistencies, and migrate to a `packages/*` organization.

## Scope

- All directories and files in the repository
- Test organization
- Source code structure → `packages/*` migration
- Editor extensions organization
- Website structure
- Root-level files
- Work package organization (`.opencode/work/`)

## Approach

### Phase 1: Audit
1. Map current structure and purpose of each directory
2. Identify inconsistencies, misplaced files, forgotten artifacts
3. Identify naming inconsistencies
4. Document what belongs where

### Phase 2: Cleanup
1. Remove or relocate misplaced files
2. Fix naming inconsistencies
3. Remove cruft/dead code if found

### Phase 3: Packages Migration
1. Design `packages/*` structure (e.g., `packages/core`, `packages/cli`, `packages/lsp`, `packages/compiler`)
2. Move code to new structure
3. Update imports and references
4. Update build configuration (tsconfig, package.json)
5. Ensure tests pass
6. Update documentation references

## Hypothesis

A cleaner, packages-based structure will:
- Make the codebase easier to navigate
- Enable independent versioning/publishing of components
- Remove cognitive load from accumulated inconsistencies
- Signal maturity to contributors

## Results

### Phase 1: Audit Findings

**Inconsistencies Found:**
1. `editors/zen.tmLanguage.json` - Duplicate of `editors/vscode/syntaxes/zen.tmLanguage.json`
2. `README.md` references non-existent `experiments/` directory
3. `tests/stress/edge-cases.test.ts` - Not actually misplaced, well-structured stress tests

**Not Issues (False Positives):**
- "Zen" vs "MDZ" naming - Legacy naming in editor configs, documented and intentional
- `website/DESIGN-EXPLORATION.md` - Belongs in website context

### Phase 2: Cleanup

**Files Removed:**
- `editors/zen.tmLanguage.json` - Redundant duplicate

**Files Updated:**
- `README.md` - Fixed reference to non-existent `experiments/` directory
- `README.md` - Updated TextMate grammar path to correct location

### Phase 3: Packages Migration

**New Structure Created:**
```
packages/
├── core/           # @zenmarkdown/core - Parser, compiler, AST
│   └── src/
│       ├── parser/
│       │   ├── ast.ts
│       │   ├── lexer.ts
│       │   └── parser.ts
│       ├── compiler/
│       │   └── compiler.ts
│       └── index.ts
├── cli/            # @zenmarkdown/cli - CLI tool
│   └── src/
│       └── index.ts
└── lsp/            # @zenmarkdown/lsp - Language server
    └── src/
        └── server.ts
```

**Configuration Updates:**
- `pnpm-workspace.yaml` - Added `packages/*` to workspace
- `package.json` - Added `build:packages` script
- `AGENTS.md` - Updated project structure documentation

**Package Details:**
- `@zenmarkdown/core` - Core library with parser and compiler exports
- `@zenmarkdown/cli` - CLI tool, depends on @zenmarkdown/core
- `@zenmarkdown/lsp` - Language server, depends on @zenmarkdown/core

**Migration Status:**
- `src/` directory removed (was duplicate of packages/core/src)
- `packages/` is now the canonical structure
- Tests updated to import from `packages/core/src`
- All packages build successfully
- All tests pass (155 tests total)

### Phase 4: Final Cleanup

**Completed:**
1. Deleted duplicate `src/` directory - tests now import from `packages/core/src`
2. Renamed packages from `@mdz/*` to `@zenmarkdown/*`:
   - `@mdz/core` → `@zenmarkdown/core`
   - `@mdz/cli` → `@zenmarkdown/cli`
   - `@mdz/lsp` → `@zenmarkdown/lsp`
3. Flattened `tests/stress/` directory:
   - Moved `tests/stress/edge-cases.test.ts` to `tests/edge-cases.test.ts`
   - Removed empty `tests/stress/` directory
4. Updated test scripts in root `package.json`:
   - Changed `build:packages` filter from `@mdz/*` to `@zenmarkdown/*`
   - Changed `test:stress` to `test:edge-cases` with updated path

### Issues Encountered

None - smooth migration.

### Decisions Made

1. Used `@zenmarkdown/*` namespace for packages (matches project identity)
2. Core package exports both parser and compiler (no separate compiler package)
3. Tests import directly from `packages/core/src` rather than using package aliases

## Evaluation

- All 155 tests pass after reorganization
- No orphaned imports or broken references
- Structure is self-documenting (directories have clear purpose)
- `packages/*` structure follows monorepo conventions
- No duplicate source code between root and packages
