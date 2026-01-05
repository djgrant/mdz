---
size: sm
category: quality
parent: wp-p1-example-review-master
priority: medium
---

# Review: Using in Project Docs (using-in-project.astro)

## Goal/Problem

Review and fix all MDZ code examples in the "Using in Project" documentation.

## Scope

`website/src/pages/docs/using-in-project.astro`

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

### Files Reviewed
- `website/src/pages/docs/using-in-project.astro`

### Code Examples Found
1. Lines 61-97: `task-processor` skill (tutorial example)
2. Lines 137-167: `task-processor` skill (LLM prompt example)
3. Lines 199-227: `code-review` skill (with HTML syntax highlighting)
4. Lines 264-283: Code review prompt for Claude Desktop
5. Lines 305-341: `task-processor` template (with HTML syntax highlighting)

### Issues Fixed

#### Control Flow Syntax (5 instances)
Fixed `WHILE` statements missing `DO:` keyword:
- Line 83: `WHILE ($attempts < $maxAttempts):` → `WHILE $attempts < $maxAttempts DO:`
- Line 152: `WHILE ($attempts < $maxAttempts):` → `WHILE $attempts < $maxAttempts DO:`
- Line 327: `WHILE ($attempts < $maxAttempts):` → `WHILE $attempts < $maxAttempts DO:`

Fixed `FOR EACH` statements missing `DO:` keyword:
- Line 224: `FOR EACH $area IN $focus:` → `FOR EACH $area IN $focus DO:`
- Line 277: `FOR EACH $area IN $focus:` → `FOR EACH $area IN $focus DO:`

Also removed unnecessary parentheses from WHILE conditions to match MDZ syntax conventions.

### Checklist Status
✅ No `{~~}` syntax found (all examples use proper syntax)
✅ Control flow fixed (all WHILE/FOR EACH now use DO:, IF uses THEN:)
✅ Variables properly declared in Context sections
✅ Types declared are used in Input parameters
✅ `uses:` dependencies (reasoning) are referenced in code-review skill
✅ No self-referencing skills
✅ Convention compliance (## Input, ## Types sections present)
✅ Examples are logically coherent and demonstrate useful patterns

## Evaluation

✅ **Complete** - All MDZ code examples reviewed and fixed.

The using-in-project.astro page had consistent control flow syntax issues where WHILE and FOR EACH statements were missing the required `DO:` keyword. All 5 instances have been corrected. The examples are now syntactically correct and follow MDZ conventions.
