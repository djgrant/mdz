---
size: sm
category: language
parent: wp-p1-language-coherence-master
---

# Implicit Variable Syntax

## Goal/Problem

Some variables are referenced but never declared - the LLM is expected to understand from context. We need special syntax to distinguish these from bugs.

## Current Problem

In debugger.mdz:
```mdz
FOR EACH $statement IN $skill.statements:
```

`$skill.statements` is never defined. Is this:
- A bug (undefined variable)?
- Intentional (LLM should infer from context)?

No way to tell currently.

## Proposed Options

### Option A: `$@` prefix
```mdz
FOR EACH $statement IN $@skill.statements:
```

Pros: Clear prefix, `@` suggests "contextual" or "ambient"
Cons: Two sigils feels heavy

### Option B: `$(name)` syntax
```mdz
FOR EACH $statement IN $(skill).statements:
```

Pros: Parens already used for grouping, feels like "resolve this"
Cons: Could conflict with function call syntax

### Option C: Different sigil entirely
```mdz
FOR EACH $statement IN @skill.statements:
```

Pros: Clean, distinct from declared variables
Cons: Loses `$` consistency for all runtime values

### Option D: Require declaration with description
```mdz
## Context
- $skill: {~~the skill being debugged}

## Workflow
FOR EACH $statement IN $skill.statements:
```

Pros: Explicit, self-documenting
Cons: More verbose, may feel redundant

## Questions to Explore

1. How often do implicit variables appear in real skills?
2. Which syntax is most readable?
3. Does the syntax suggest the right mental model?
4. How does this interact with LSP (unused var detection)?

## Approach

1. Audit examples for all implicit variable usage
2. Prototype each syntax option
3. Evaluate readability and clarity
4. Propose recommendation

## Decision

**Chosen: Option D - Require explicit declaration with semantic description**

After careful analysis, I recommend **not adding new syntax** for implicit variables. Instead, require explicit declaration with semantic descriptions.

### Reasoning

1. **The "implicit variable" problem is actually a type evolution problem**

   Looking at `debugger.mdz`:
   ```mdz
   ## Input
   - $skill: $String = the skill to debug
   
   ## Workflow
   ### 1. Setup
   1. Load $skill source
   2. Parse into AST using [[#parse-step]]
   
   ### 2. Execute with Tracing
   FOR EACH $statement IN $skill.statements:
   ```

   The issue isn't that `$skill` is undeclared - it IS declared. The issue is that `$skill` changes from a `$String` to a parsed AST during execution. The `.statements` property comes from the semantic transformation in step 2.

2. **This aligns with MDZ philosophy**

   From VISION.md: "Types are contracts for tooling, not runtime enforcement." The LLM is the runtime - it understands that after "Parse into AST", the `$skill` variable has structure.

3. **New syntax adds complexity without solving the real problem**

   - `$@skill` or `@skill` would mark variables as "implicit", but `$skill` isn't implicit - it's declared!
   - The real issue is that MDZ doesn't model how variables *evolve* during execution
   - No amount of prefix syntax fixes the fundamental type evolution issue

4. **The solution is better authoring, not new syntax**

   The current `debugger.mdz` should be rewritten to make the transformation explicit:

   ```mdz
   ## Input
   - $skillName: $String = the skill to debug
   
   ## Context
   - $skill: {~~the parsed AST of $skillName after loading}
   
   ## Workflow
   ### 1. Setup
   1. Load skill source for $skillName
   2. Parse into $skill AST using [[#parse-step]]
   
   ### 2. Execute with Tracing  
   FOR EACH $statement IN $skill.statements:
   ```

   Now it's clear: `$skillName` is the string input, `$skill` is the parsed structure.

5. **Tooling can still help**

   The compiler can warn when properties are accessed on variables whose declared type doesn't support them. This is already partially implemented in scope validation.

### What I'm NOT Implementing

- No new `$@` prefix syntax
- No `$(name)` syntax  
- No `@name` sigil
- No parser/lexer changes

### What I AM Doing

1. ✅ Update `debugger.mdz` to use clearer variable naming
2. ✅ Add documentation about this pattern in the spec
3. ✅ Update work package with findings

## Results

### Analysis Findings

1. **Frequency of "implicit" variables**: Only 1 case found across all examples (`$skill.statements` in debugger.mdz)

2. **Root cause**: Not truly implicit - it's a type evolution during semantic interpretation

3. **The pattern**:
   - Input declares a simple type (`$String`)
   - Workflow transforms it semantically (parse, load, enrich)
   - Later code accesses properties on the transformed value
   - Static analysis can't track semantic transformations

4. **Best solution**: Author skills to make transformation explicit by using distinct variable names for before/after states

### Example Fix

**Before** (confusing):
```mdz
- $skill: $String = the skill to debug
...
FOR EACH $statement IN $skill.statements:
```

**After** (clear):
```mdz
- $skillPath: $String = path to the skill to debug
- $skill: {~~the loaded and parsed skill AST}
...
FOR EACH $statement IN $skill.statements:
```

## Evaluation

The chosen approach:
- ✅ Maintains MDZ simplicity (no new syntax to learn)
- ✅ Aligns with "Source = Output" philosophy
- ✅ Makes intent clearer through better authoring
- ✅ Enables future tooling improvements (type flow analysis)
- ✅ Doesn't add parser complexity
