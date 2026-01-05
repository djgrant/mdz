---
size: sm
category: quality
parent: wp-p1-example-review-master
priority: high
---

# Review: Getting Started (getting-started.astro)

## Goal/Problem

Review and fix all MDZ code examples in the getting started guide - critical onboarding doc.

## Scope

`website/src/pages/docs/getting-started.astro`

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

1. Read the file and extract all code examples
2. Check each against the review checklist
3. Make fixes directly to the file
4. Document changes made

## Results

Reviewed `website/src/pages/docs/getting-started.astro` (lines 27-45).

**Examples Found:** 1 MDZ code example (greeting.mdz)

**Review Findings:**
- ✅ No `{~~}` syntax issues (uses proper syntax throughout)
- ✅ No control flow to validate
- ✅ Variables properly declared: `$name` in `## Input` section
- ✅ Types properly used: `$Greeting` and `$Name` declared in `## Types`, both referenced in the skill
- ✅ No `uses:` dependencies (none needed for this simple example)
- ✅ No self-referencing issues
- ✅ Convention compliance: Proper `## Input` and `## Types` sections, frontmatter complete
- ✅ Logical coherence: Simple, clear introductory example

**Changes Made:** None required - all examples already correct.

## Evaluation

**Status:** ✅ Complete - No fixes needed

The getting-started guide contains a single, well-crafted introductory example that already follows all MDZ conventions and syntax requirements. This is appropriate for a getting-started guide as it provides a simple, correct example for users' first exposure to MDZ.
