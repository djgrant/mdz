---
size: lg
category: quality
---

# Code Example Review (Master) ✅ COMPLETE

## Goal/Problem

Code examples across the codebase had issues:
- Outdated `{~~}` syntax (should be `/content/`)
- Undeclared variables
- Skill dependencies that are unused, unneeded, or self-referencing
- Types declared but not used
- Missing or incorrect section conventions (e.g., `## Input` for parameters)
- Examples that don't make logical sense

## Scope

All files containing MDZ code examples (22 sub-work packages).

## Results

### Summary Statistics
- **Total Work Packages**: 22
- **Completed**: 22
- **Files Requiring Fixes**: 12
- **Files Already Compliant**: 10
- **Total Agents Spawned**: 23 (1 retry)

### Fixes Applied by Category

#### Semantic Marker Syntax (`{~~}` → `/content/`)
1. `website/src/pages/index.astro` - 3 instances
2. `website/src/pages/playground.astro` - 1 instance (semantic condition)
3. `website/src/pages/docs/higher-order.astro` - 1 instance
4. `website/src/pages/docs/internals/terminology.astro` - 1 instance

#### Control Flow Syntax (WHILE...DO:, etc.)
1. `website/src/pages/index.astro` - Added DO: to WHILE
2. `website/src/pages/docs/using-in-project.astro` - 5 instances (WHILE and FOR EACH missing DO:)
3. `README.md` - 1 instance (WHILE missing DO:)

#### Unused/Self-Referencing Dependencies
1. `website/src/pages/playground.astro` - Removed self-referencing `scientific-method`
2. `website/src/pages/docs/higher-order.astro` - Removed self-referencing `scientific-method`
3. `examples/skills/debugger.mdz` - Removed unused `work-packages`
4. `examples/skills/pr-reviewer.mdz` - Removed unused `work-packages`
5. `examples/skills/skill-composer.mdz` - Removed unused `work-packages` and `the-scientist`
6. `examples/skills/the-scientist.mdz` - Removed unused `scientific-method`

#### Variable Declaration Issues
1. `website/src/pages/playground.astro` - Used `$/result/` for inferred variable
2. `examples/skills/pr-reviewer.mdz` - Added missing `$outcome` declaration
3. `examples/skills/skill-composer.mdz` - Removed unused `$entryPoint`, `$currentSkill`
4. `spec/grammar.md` - Added missing `$prioritized`, `$complete`, `$result` declarations

#### Convention Compliance
1. `website/src/pages/docs/skill-library.astro` - Added proper `uses:`, `## Input`, `## Output` sections
2. `spec/language-spec.md` - Fixed input parameter documentation (moved prose to comments)
3. `spec/grammar.md` - Fixed template interpolation syntax (`{$n}` → `${n}`)

#### IDE Integration
1. `website/src/pages/docs/ide.astro` - Updated autocomplete trigger reference

### Files Already Compliant (No Changes Needed)
1. `website/src/pages/docs/getting-started.astro`
2. `website/src/pages/docs/syntax.astro`
3. `website/src/pages/docs/concepts.astro`
4. `website/src/pages/docs/types.astro`
5. `website/src/pages/docs/control-flow.astro`
6. `website/src/pages/docs/composition.astro`
7. `website/src/pages/docs/cli.astro`
8. `website/src/pages/docs/api.astro`
9. `website/src/pages/examples/index.astro` (no MDZ code - just links)
10. `website/src/pages/docs/internals/*.astro` (except terminology.astro)

### Verification
All example files pass `mdz check`:
```
✓ examples/skills/debugger.mdz is valid
✓ examples/skills/pr-reviewer.mdz is valid  
✓ examples/skills/skill-composer.mdz is valid
✓ examples/skills/the-scientist.mdz is valid
✓ examples/snippets/type-semantic.mdz is valid
```

All tests pass (37 tests).

## Evaluation

The code example review was successful. Key findings:

1. **Semantic Marker Migration**: The `{~~}` → `/content/` syntax migration was mostly complete, with only 6 instances needing correction across 4 files.

2. **Control Flow Syntax**: Several files had WHILE loops missing the `DO:` delimiter, indicating this syntax change wasn't fully propagated during the v0.3 update.

3. **Dependency Hygiene**: Multiple example files had unused or self-referencing dependencies in their `uses:` arrays. This is now cleaned up, making examples better teaching material.

4. **Spec Files**: The authoritative spec files had some minor inconsistencies that are now corrected. This is important as these are the source of truth.

5. **Documentation Quality**: Most documentation pages were already compliant, indicating good baseline quality. The fixes were concentrated in a few files.

The codebase now has consistent, correct MDZ examples throughout all documentation and example files.
