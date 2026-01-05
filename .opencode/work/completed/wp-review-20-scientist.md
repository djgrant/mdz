---
size: sm
category: quality
parent: wp-p1-example-review-master
priority: medium
---

# Review: The Scientist Example (the-scientist.mdz)

## Goal/Problem

Review and fix the scientist skill example - this is a real .mdz file that can be validated.

## Scope

`examples/skills/the-scientist.mdz`

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
4. Verify with `pnpm mdz check examples/skills/the-scientist.mdz`
5. Document changes made

## Results

### Changes Made

1. **Removed unused dependency** (line 6)
   - Removed `scientific-method` from `uses:` list as it was not referenced anywhere in the skill
   - Only `work-packages` is used (referenced via `[[work-packages]]` at line 54)

2. **Fixed inferred content syntax** (line 42)
   - Changed `WHILE NOT diminishing returns` to `WHILE NOT $/diminishing returns/`
   - "diminishing returns" is an inferred concept evaluated by the agent, not a declared variable

### Validation

✓ File passes validation with `node packages/cli/dist/index.js check examples/skills/the-scientist.mdz`

```
✓ examples/skills/the-scientist.mdz is valid

  Types: 5
  Variables: 8
  Dependencies: 1
```

### Checklist Review

✓ **Syntax correctness**
  - No `{~~}` syntax present
  - Control flow uses proper IF...THEN:, WHILE...DO: syntax
  - Variables properly declared with `$name`

✓ **Semantic correctness**
  - All variables used are declared or use `$/inferred/` syntax
  - All types declared are used (Hypothesis, Experiment, Observation, ValidationResult, Strategy)
  - `uses:` dependencies match actual references (`[[work-packages]]`)
  - No self-referencing

✓ **Convention compliance**
  - Input parameters in `## Input` section
  - Type definitions in `## Types` section
  - Frontmatter has `name:` and `description:`

✓ **Logical coherence**
  - Demonstrates hypothesis-driven iteration pattern
  - Shows sub-agent orchestration with work packages
  - Clear experimental methodology

## Evaluation

**Status**: ✅ Complete

The scientist skill example is now compliant with all mdz syntax and semantic requirements. The skill demonstrates a sophisticated pattern for orchestrating hypothesis-driven experimentation with sub-agents, making it a valuable example in the skill library.
