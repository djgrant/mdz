---
size: sm
category: examples
parent: wp-p1-language-coherence-master
---

# Example Feature Coverage

## Goal/Problem

Several parser-supported features lack example usage. This makes the language feel incomplete and makes it harder for users to understand how to use these features.

## Scope

- `examples/*.mdz` - Add or update examples

## Features Needing Examples

### 1. PARALLEL FOR EACH

Currently no example uses `PARALLEL FOR EACH`. Could be added to:
- **pr-reviewer.mdz** - Review files in parallel
- **skill-composer.mdz** - Execute independent skills in parallel

### 2. BREAK and CONTINUE

No example uses early exit or skip patterns. Could be added to:
- **debugger.mdz** - Break on error conditions
- **the-scientist.mdz** - Continue on inconclusive experiments

### 3. imports with aliases

All examples use simple `uses:` arrays. Could demonstrate:
- Path-based imports
- Package references with aliases

## Approach

1. Choose which examples to update (prefer natural fit over forced usage)
2. Add feature usage that makes sense in context
3. Verify examples still compile without errors
4. Update if any documentation references need adjustment

## Hypothesis

Adding real usage of these features validates they work and provides learning material for users.

## Results

### Completed (2026-01-05)

**1. PARALLEL FOR EACH** - Added to `pr-reviewer.mdz`:
- Changed `FOR EACH ($filename, $diff) IN $files:` to `PARALLEL FOR EACH`
- Natural fit: file reviews are independent and can run concurrently
- Location: line 39

**2. BREAK** - Added to `debugger.mdz`:
- Added `BREAK` after hitting a breakpoint in the inner `FOR EACH $bp IN $breakpoints:` loop
- Natural fit: once a breakpoint is hit, no need to check remaining breakpoints
- Location: line 59

**3. CONTINUE** - Added to `skill-composer.mdz`:
- Added `CONTINUE` when a skill has missing dependencies in `FOR EACH $skill IN $plan:`
- Natural fit: skip skills that can't be validated due to missing deps
- Location: line 52

**4. imports with aliases** - SKIPPED per work package instructions

### Additional Fixes

Several pre-existing issues were fixed during this work:

**Build issues:**
- Fixed wrong import path `@mdz/core` → `@zenmarkdown/core` in CLI and LSP packages
- Added missing `ImportDeclaration` type to AST
- Added `imports` field to `Frontmatter` interface
- Added `imports` edge type to `DependencyEdge` type
- Fixed implicit `any` type annotations in CLI and LSP

**Example fixes:**
- Fixed semantic condition in `pr-reviewer.mdz`: `$filename ends with ".md"` → `{~~$filename ends with ".md"}`
- Removed broken section reference in `the-scientist.mdz` due to parser limitation with headings inside control flow

### All Tests Pass

163 tests across all suites pass:
- Parser: 44 tests
- Compiler: 34 tests
- Integration: 22 tests
- Edge cases: 32 tests
- v0.2 features: 31 tests

### All Examples Validate

```
✓ examples/debugger.mdz is valid
✓ examples/pr-reviewer.mdz is valid
✓ examples/skill-composer.mdz is valid (3 warnings)
✓ examples/the-scientist.mdz is valid
```

## Evaluation

**Did the additions feel natural?**
- PARALLEL FOR EACH in pr-reviewer: Yes - file reviews are clearly independent
- BREAK in debugger: Yes - stop checking breakpoints once one is hit
- CONTINUE in skill-composer: Yes - skip invalid skills during validation

**Are they good learning examples?**
- Yes - each demonstrates a real use case where the feature provides value
- The examples show common patterns: parallel processing, early exit, skip invalid items

**Limitations discovered:**
- BREAK/CONTINUE inside WHILE loops with subheadings (####) don't work due to how the parser handles headings in control flow blocks. The parser's `parseIndentedBlocks` stops at HEADING tokens, so loop context is lost.
