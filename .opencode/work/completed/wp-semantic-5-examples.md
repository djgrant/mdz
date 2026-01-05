---
size: sm
category: language
parent: wp-p1-semantic-marker-syntax
---

# Update Examples for Semantic Marker Syntax

## Goal/Problem

Update all example files to use the new `/thing/` syntax instead of `{~~thing~~}`.

## Scope

- `examples/debugger.mdz` (8 instances)
- `examples/pr-reviewer.mdz` (10 instances)
- `examples/skill-composer.mdz` (4 instances)
- `examples/the-scientist.mdz` (6 instances)

Total: 28 instances of `{~~...~~}` to replace.

## Approach

### Transformation Rules

1. `{~~content~~}` → `/content/`
2. `{~~content with $var~~}` → `/content with $var/`

### File-by-file

**debugger.mdz:**
- `{~~the loaded and parsed skill AST from $skillPath}` → `/the loaded and parsed skill AST from $skillPath/`
- `{~~debug output location}` → `/debug output location/`
- etc.

**pr-reviewer.mdz:**
- `{~~the nature of the changes}` → `/the nature of the changes/`
- `IF {~~file contains logic changes}` → `IF /file contains logic changes/`
- etc.

**skill-composer.mdz:**
- `{~~cycle detected}` → `/cycle detected/`
- etc.

**the-scientist.mdz:**
- `{~~work package directory}` → `/work package directory/`
- Consider if any should become `$/inferred/` variables
- etc.

### Verification

After changes, run `mdz check` on each file to ensure they compile.

## Hypothesis

This is a straightforward find-and-replace task. The examples should work unchanged in meaning.

## Results

All example files updated successfully:

**debugger.mdz** - 8 instances updated
- ✓ Compiles without errors

**pr-reviewer.mdz** - 9 instances updated  
- ✓ Compiles without errors

**skill-composer.mdz** - 4 instances updated
- ✓ Compiles with 3 warnings (pre-existing, unrelated to syntax change)

**the-scientist.mdz** - 4 instances updated
- ⚠ Pre-existing parse errors on line 43 (`WHILE NOT diminishing returns...`)
- These errors existed before the syntax migration and are unrelated to semantic markers

Total: 25 instances transformed (fewer than estimated 28)

## Evaluation

- All semantic markers successfully migrated from `{~~thing~~}` to `/thing/`
- Variable references inside markers preserved correctly (e.g., `/$filename ends with ".md"/`)
- 3 of 4 files compile cleanly
- the-scientist.mdz has pre-existing WHILE statement parse errors unrelated to this change
