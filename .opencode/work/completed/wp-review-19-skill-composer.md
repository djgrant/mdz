---
size: sm
category: quality
parent: wp-p1-example-review-master
priority: medium
---

# Review: Skill Composer Example (skill-composer.mdz)

## Goal/Problem

Review and fix the skill composer skill example - this is a real .mdz file that can be validated.

## Scope

`examples/skills/skill-composer.mdz`

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
4. Verify with `pnpm mdz check examples/skills/skill-composer.mdz`
5. Document changes made

## Results

### Issues Found and Fixed

1. **Removed unused dependencies** (lines 6-7)
   - Removed `work-packages` (not referenced in file)
   - Removed `the-scientist` (not referenced in file)
   - Kept only `orchestrate` which is actually used via `[[orchestrate]]`

2. **Fixed tuple type syntax** (line 27)
   - Changed `$results: ($SkillRef, $String)[] = []` to use proper type reference
   - Added new type `$SkillResult: tuple of skill reference and its output string`
   - Updated Context to `$results: $SkillResult[] = []`

3. **Removed unused variables** (lines 20, 28)
   - Removed `$entryPoint` from Input (declared but never used)
   - Removed `$currentSkill` from Context (declared but never used)

### Validation Results

File passes `mdz check` validation:
- ✓ Syntax is valid
- ✓ 5 types defined and used
- ✓ 8 variables properly declared
- ✓ 1 dependency correctly referenced
- ⚠ 3 warnings about orchestrate skill parameters (expected - shows parameter passing pattern)

All semantic markers use correct `/content/` syntax, control flow uses proper keywords (IF...THEN:, FOR EACH...IN:), and all sections follow MDZ conventions.

## Evaluation

✅ **Complete** - The skill-composer.mdz file now passes all validation checks and follows MDZ conventions. All unused dependencies and variables have been removed, and the tuple type syntax has been properly defined. The file demonstrates a realistic skill composition pattern with proper dependency management.
