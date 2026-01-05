---
size: sm
category: quality
parent: wp-p1-example-review-master
priority: high
---

# Review: Syntax Docs (syntax.astro)

## Goal/Problem

Review and fix all MDZ code examples in the syntax documentation.

## Scope

`website/src/pages/docs/syntax.astro`

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

### Review Completed: ✅ No Issues Found

Reviewed all MDZ code examples in `website/src/pages/docs/syntax.astro`. The file is **fully compliant** with current syntax standards.

#### Examples Reviewed (13 total):

1. **Lines 64-66**: Variable declarations with type annotations
2. **Lines 69-71**: Variable declaration examples
3. **Lines 77-80**: Lambda expressions with arrow operator
4. **Lines 86-95**: Input/Context/Workflow with FOR EACH loop
5. **Lines 122-128**: Inline semantic markers using `/content/`
6. **Lines 134-135**: Inferred variables using `$/name/`
7. **Lines 143-144**: Semantic type annotations
8. **Lines 152-154**: FOR EACH loop basic syntax
9. **Lines 158-159**: FOR EACH with tuple destructuring
10. **Lines 165-167**: WHILE loop with DO: delimiter
11. **Lines 173-181**: IF/THEN/ELSE conditionals
12. **Lines 189-192**: Delegation with WITH clause
13. **Lines 198-200**: Parameter passing

#### Checklist Results:

✅ **Syntax correctness**: All examples use `/content/` (no `{~~}` found)
✅ **Control flow**: Proper `IF...THEN:`, `WHILE...DO:`, `FOR EACH...IN:` syntax throughout
✅ **Variables**: All properly declared with `$` prefix or using `$/inferred/` syntax
✅ **Semantic correctness**: Variables used appropriately, no unused types
✅ **Convention compliance**: Examples demonstrate proper section structure
✅ **Logical coherence**: Each example clearly demonstrates its intended concept

### Changes Made

**None required** - all examples are already correct.

## Evaluation

**Status**: ✅ PASS

The syntax documentation page serves as an excellent reference and all examples are syntactically correct and semantically sound. The examples properly demonstrate:

- Modern `/content/` semantic marker syntax
- Correct control flow delimiters (`:` after THEN, DO, and collection loops)
- Proper variable declaration and typing conventions
- Appropriate use of inferred variables with `$/name/`
- Skill composition and delegation patterns

This page can serve as a canonical reference for MDZ syntax.
