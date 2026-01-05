---
size: sm
category: quality
parent: wp-p1-example-review-master
priority: medium
---

# Review: API Docs (api.astro)

## Goal/Problem

Review and fix all MDZ code examples in the API documentation.

## Scope

`website/src/pages/docs/api.astro`

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

**File reviewed:** `website/src/pages/docs/api.astro`

**MDZ code examples found:** 1 (embedded as string literal in TypeScript code)

**Analysis:**
The API documentation page is primarily focused on TypeScript/JavaScript API usage and contains only one MDZ code example - a minimal skill embedded as a template literal string in the parsing example (lines 20-28).

**MDZ example content:**
```mdz
---
name: my-skill
description: When you need to do something
---

## Workflow

1. Do the thing
```

**Review findings:**
- ✅ No `{~~}` syntax issues (none used)
- ✅ No control flow issues (none used)
- ✅ No variable declaration issues (none used)
- ✅ No type declaration issues (none used)
- ✅ No dependency issues (none used)
- ✅ No self-referencing issues (none used)
- ✅ Frontmatter correctly includes `name:` and `description:`
- ✅ Example is intentionally minimal to demonstrate parsing API

**Changes made:** None required

**Conclusion:** The embedded MDZ example is intentionally minimal and serves its purpose of demonstrating the parsing API. No syntax or semantic issues found.

## Evaluation

✅ **COMPLETE** - API documentation reviewed. No fixes needed. The single MDZ example is a minimal demonstration of skill syntax for the parsing API and contains no syntax issues.
