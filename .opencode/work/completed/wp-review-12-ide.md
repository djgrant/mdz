---
size: sm
category: quality
parent: wp-p1-example-review-master
priority: medium
---

# Review: IDE Docs (ide.astro)

## Goal/Problem

Review and fix all MDZ code examples in the IDE integration documentation.

## Scope

`website/src/pages/docs/ide.astro`

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

**File reviewed:** `website/src/pages/docs/ide.astro`

**MDZ code examples found:** 0

The IDE documentation page contains no MDZ code examples - only bash and TypeScript snippets for tooling setup.

**Changes made:**
1. **Line 69** - Updated autocomplete trigger documentation from `{~~` to `/` to reflect current semantic marker syntax

**Summary:**
- No MDZ code examples to review
- Fixed outdated syntax reference in LSP feature description
- File is now consistent with current MDZ syntax conventions

## Evaluation

✅ **Complete** - Review completed successfully. No MDZ code examples were present in this documentation page, which focuses on IDE tooling setup. Updated outdated syntax reference to maintain consistency with current MDZ conventions.
