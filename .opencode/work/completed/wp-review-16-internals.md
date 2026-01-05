---
size: sm
category: quality
parent: wp-p1-example-review-master
priority: medium
---

# Review: Internals Docs (internals/*.astro)

## Goal/Problem

Review and fix all MDZ code examples in the internals documentation pages.

## Scope

- `website/src/pages/docs/internals/index.astro`
- `website/src/pages/docs/internals/ast.astro`
- `website/src/pages/docs/internals/compilation.astro`
- `website/src/pages/docs/internals/terminology.astro`
- `website/src/pages/docs/internals/validation.astro`

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

1. Read all files in scope
2. Extract all code examples from each
3. Check each against the review checklist
4. Make fixes directly to the files
5. Document changes made

## Results

### Files Reviewed

1. **index.astro** - No MDZ code examples (overview page only)
2. **ast.astro** - 2 MDZ examples, all correct
3. **compilation.astro** - No MDZ code examples (TypeScript only)
4. **terminology.astro** - 1 fix applied
5. **validation.astro** - 4 MDZ examples, all correct (intentionally showing errors)

### Issues Found and Fixed

#### terminology.astro:24
- **Issue**: Used old `{~~content}` syntax in semantic marker description
- **Fix**: Changed to `/content/` syntax
- **Before**: `<code>&#123;~~content&#125;</code>) — Content for LLM interpretation. The <code>~~</code> suggests "approximately."`
- **After**: `<code>/content/</code>) — Content for LLM interpretation.`

### Summary

- Total files reviewed: 5
- Total MDZ examples found: 7
- Issues fixed: 1 (old semantic marker syntax in documentation text)
- All actual MDZ code examples were already using correct syntax
- validation.astro examples intentionally show errors for demonstration purposes and use correct syntax except for the specific error being demonstrated

## Evaluation

✅ **Work package complete**

The internals documentation was in excellent condition. Only one minor issue was found - outdated syntax in a terminology description. All MDZ code examples were already using correct, current syntax. The validation examples appropriately demonstrate errors while maintaining correct syntax in non-error portions.
