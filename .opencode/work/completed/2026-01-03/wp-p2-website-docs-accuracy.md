---
size: sm
category: website
---

# Website Documentation Accuracy Pass

## Goal/Problem

The website has known inaccuracies that could confuse users:
- Homepage CLI example shows `mdz build` but command is `mdz compile`
- API docs reference `validate()` and `build()` functions that don't exist (actual: `parse()`, `compile()`)
- Graph command signature documented as directory but takes file
- IDE/LSP docs marked "planned" but LSP server exists

## Scope

- `website/src/pages/`
- `website/src/pages/docs/`

## Approach

1. Audit each docs page against actual CLI/API
2. Fix discrepancies
3. Verify examples work

## Hypothesis

Accurate docs prevent user frustration and support requests.

## Results

**Fixed 4 files:**

### 1. Homepage (`index.astro`)
- Changed `mdz build skill.mdz -o ./dist` → `mdz compile skill.mdz -o ./dist`
- Changed comment from "Build with preprocessing" → "Compile (validation + output)"

### 2. CLI Docs (`docs/cli.astro`)
- Complete rewrite to match actual CLI
- Changed all `zen` commands → `mdz` commands
- Replaced `build` command with `compile` command
- Fixed `graph` command: takes `<file>` not `<directory>`
- Added correct options for `compile` (--source-map, --metadata)
- Updated example output to match actual CLI output

### 3. API Docs (`docs/api.astro`)
- Complete rewrite to match actual API
- Replaced `validate()` with `compile()` function
- Replaced `build()` with examples using `compile()`
- Fixed `CompileOptions` interface to match actual options
- Fixed dependency graph API (`buildFullDependencyGraph`)
- Updated all code examples to show actual return types

### 4. IDE Docs (`docs/ide.astro`)
- Changed "LSP (Planned)" to "Language Server (LSP)" 
- Added actual LSP features that are implemented
- Added code example for using the language server
- Updated prose from "zen" to "MDZ"

### 5. Types Docs (`docs/types.astro`)
- Fixed "zen types" → "MDZ types"
- Fixed broken sentence about runtime discovery

## Evaluation

The docs now accurately reflect the v0.3 implementation. The key insight: the v0.3 architecture is validator-first, meaning `compile()` validates and returns source unchanged. The old docs were written for a hypothetical transformation-based compiler that was never built.
