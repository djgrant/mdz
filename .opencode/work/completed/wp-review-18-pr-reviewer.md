---
size: sm
category: quality
parent: wp-p1-example-review-master
priority: medium
---

# Review: PR Reviewer Example (pr-reviewer.mdz)

## Goal/Problem

Review and fix the PR reviewer skill example - this is a real .mdz file that can be validated.

## Scope

`examples/skills/pr-reviewer.mdz`

## Review Checklist

1. **Syntax correctness**
   - No `{~~}` syntax (should be `/content/`)
   - Proper control flow (IF...THEN:, WHILE...DO:, FOR EACH...IN:)
   - Variables declared with `$name`

2. **Semantic correctness**
   - Variables used are declared (or use `$/inferred/` syntax)
   - Types declared are used somewhere
   - `uses:` dependencies are actually referenced via `[[skill-name]]`
   - No self-referencing (skill can't use itself)

3. **Convention compliance**
   - Input parameters in `## Input` section
   - Type definitions in `## Types` section
   - Frontmatter has `name:` and `description:`

4. **Logical coherence**
   - Example makes sense and demonstrates something useful
   - Not just syntax soup

## Approach

1. Read the file
2. Check against the review checklist
3. Make fixes directly to the file
4. Verify with `pnpm mdz check examples/skills/pr-reviewer.mdz`
5. Document changes made

## Results

### Issues Found and Fixed

1. **Missing variable declaration**: `$outcome` was used in the workflow but not declared in the Context section
   - Fixed by adding `$outcome: $ReviewOutcome` to the Context section (line 27)

2. **Unused dependency**: `work-packages` was listed in `uses:` but never referenced via `[[work-packages]]`
   - Fixed by removing the unused `uses:` section from frontmatter

### Validation Results

✓ All syntax checks passed:
- No `{~~}` syntax found (correctly uses `/content/` throughout)
- Proper control flow: `IF...THEN:`, `ELSE:` used correctly
- Variables properly declared with `$name`

✓ All semantic checks passed:
- All variables are now declared before use
- All declared types are used (`$PRType`, `$ReviewOutcome`, `$Severity`, `$Finding`)
- No unused dependencies
- No self-referencing

✓ Convention compliance verified:
- Has `## Input` section with proper parameter declarations
- Has `## Types` section with type definitions
- Has `## Workflow` section with numbered steps
- Frontmatter has `name:` and `description:`

✓ **Compilation successful**: `pnpm test:examples` confirms `skills/pr-reviewer.mdz compiles without errors`

## Evaluation

✅ **COMPLETE** - The pr-reviewer.mdz file now passes all validation checks and compiles successfully. All syntax and semantic issues have been resolved.
