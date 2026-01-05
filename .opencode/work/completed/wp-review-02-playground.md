---
size: sm
category: quality
parent: wp-p1-example-review-master
priority: high
---

# Review: Playground (playground.astro)

## Goal/Problem

Review and fix all MDZ code examples in the interactive playground page.

## Scope

`website/src/pages/playground.astro`

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

Reviewed all 5 scenarios in playground.astro (lines 198-341).

### Issues Fixed

**Scenario: "valid" (scientific-method.mdz)**
1. **Self-referencing skill** (line 205): Removed `- scientific-method` from uses: list - a skill cannot use itself
2. **Undeclared condition** (line 220): Changed `NOT diminishing returns` to `NOT /diminishing returns/` - using semantic marker syntax
3. **Undeclared variable** (line 226): Changed `$result` to `$/result/` - using inferred variable syntax
4. **Updated insight text** (line 228): Removed reference to "scientific-method" since it's no longer self-referencing

### Scenarios Verified as Correct

**Scenario: "broken-ref"** - Intentionally broken for demonstration (broken section references)
**Scenario: "missing-type"** - Intentionally broken for demonstration (typos in type names)
**Scenario: "undeclared"** - Intentionally showing undeclared dependencies (warnings, not errors)
**Scenario: "complex"** - All syntax correct ✓
  - Control flow: `FOR EACH $skill IN $skills:` ✓
  - Semantic markers: `IF /cycle detected/ THEN:` ✓
  - Variables properly declared ✓

All changes made to: website/src/pages/playground.astro:200-228

## Evaluation

✅ Complete - All MDZ examples in playground.astro now follow current syntax standards.
- Self-referencing removed
- Semantic markers use /content/ syntax
- Inferred variables use $/name/ syntax
- Control flow syntax correct
- Intentionally broken examples verified to demonstrate specific error cases
