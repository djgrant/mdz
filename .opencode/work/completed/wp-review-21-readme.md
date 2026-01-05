---
size: sm
category: quality
parent: wp-p1-example-review-master
priority: medium
---

# Review: README.md

## Goal/Problem

Review and fix all MDZ code examples in the project README.

## Scope

`README.md`

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
- `README.md`

### MDZ Code Examples Found
1. Lines 41-69: Main skill example (frontmatter, Types, Input, Workflow)
2. Lines 74-77: Type definition examples
3. Lines 80-84: Built-in primitives example
4. Lines 87-90: Variables example
5. Lines 93-97: References example
6. Lines 100-106: Semantic markers example
7. Lines 109-120: Control flow example

### Issues Found and Fixed

**Issue 1: Incorrect WHILE syntax (Line 113)**
- **Problem**: Used `WHILE (condition AND $count < 5):` without `DO:` keyword
- **Fix**: Changed to `WHILE condition AND $count < 5 DO:`
- **Location**: README.md:113

### Summary
- **Total examples**: 7
- **Issues found**: 1
- **Issues fixed**: 1
- **Status**: ✅ All examples now comply with P1 syntax standards

## Evaluation

The README.md review is complete. One syntax error was found and corrected:

1. **WHILE loop syntax**: The control flow example incorrectly showed `WHILE (condition):` instead of the required `WHILE condition DO:` syntax. This has been fixed to align with the P1 syntax standards.

All other examples were already correct:
- ✅ No `{~~}` syntax (all use `/content/` semantic markers)
- ✅ Proper control flow keywords (FOR EACH...IN:, IF...THEN:, ELSE:)
- ✅ Variables properly declared before use
- ✅ Types declared and used correctly

The README now serves as an accurate reference for MDZ syntax.
