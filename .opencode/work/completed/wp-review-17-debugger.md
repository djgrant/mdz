---
size: sm
category: quality
parent: wp-p1-example-review-master
priority: medium
---

# Review: Debugger Example (debugger.mdz)

## Goal/Problem

Review and fix the debugger skill example - this is a real .mdz file that can be validated.

## Scope

`examples/skills/debugger.mdz`

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
4. Verify with `pnpm mdz check examples/skills/debugger.mdz`
5. Document changes made

## Results

### Review Findings

The debugger.mdz file was reviewed against all syntax and semantic requirements:

**✓ Syntax Correctness:**
- Uses `/content/` semantic markers (not `{~~}`)
- Proper control flow: `IF...THEN:`, `WHILE...DO:`, `FOR EACH...IN:` all correct
- Variables properly declared with `$name`

**✓ Semantic Correctness:**
- All variables used are either declared or use proper inferred syntax
- 4 types defined: `$TraceLevel`, `$TraceEvent`, `$Breakpoint`, `$StackFrame` - all used
- Built-in types `$String` and `$String[]` used correctly
- Section references `[[#parse-step]]` and `[[#inspection-prompt]]` reference internal sections

**✓ Convention Compliance:**
- `## Input` section present with proper parameter declarations
- `## Types` section present with all type definitions
- Frontmatter has required `name:` and `description:` fields
- `## Workflow` section properly structures the main logic

**✓ Logical Coherence:**
- Demonstrates a useful debugging/tracing capability for MDZ skills
- Logical flow from setup → execution with tracing → reporting
- Includes interactive breakpoint functionality

### Changes Made

1. **Removed unused dependency** (line 4-5): Removed `uses: - work-packages` from frontmatter as this dependency was declared but never referenced via `[[work-packages]]` in the skill body

### Validation Results

```
✓ examples/skills/debugger.mdz is valid

  Types: 4
  Variables: 8
  Dependencies: 0
```

## Evaluation

**Status:** ✅ Complete

The debugger.mdz file now passes all validation checks and follows MDZ syntax conventions correctly. The file demonstrates a sophisticated debugging capability with tracing, breakpoints, and step-through execution - a useful example for the MDZ skill library.
