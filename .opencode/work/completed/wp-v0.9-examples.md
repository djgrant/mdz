# v0.9 Examples Updates

## Goal

Update all example .mdz files to v0.9 syntax.

## Scope

- `examples/**/*.mdz` (29 files, 18 need changes)

## Changes Required

### Breaking: PARALLEL FOR EACH → ASYNC DELEGATE

**Files affected (6):**
1. `examples/standalone-skills/skill/multi-file-analyzer.mdz`
2. `examples/standalone-skills/skill/doc-freshness-checker.mdz`
3. `examples/standalone-skills/skill/adversarial-review.mdz`
4. `examples/standalone-skills/skill/pre-mortem.mdz`
5. `examples/standalone-skills/skill/brainstorm-parallel.mdz`
6. `examples/pr-reviewer/agent/pr-reviewer.mdz`

**Migration pattern:**
```mdz
# Before (v0.8)
PARALLEL FOR EACH $file IN $files:
  DELEGATE /analyze $file/ TO ~/agent/analyzer

# After (v0.9)
$results = []
FOR EACH $file IN $files:
  $results << ASYNC DELEGATE /analyze $file/ TO ~/agent/analyzer
```

### Breaking: ## Types/Input/Context → Frontmatter

**Files affected (14):**
All files with `## Types`, `## Input`, or `## Context` sections.

**Migration pattern:**
```mdz
# Before (v0.8)
---
name: my-skill
description: Does something
---

## Types

$MyType: /description/

## Input

- $param: $String

## Context

- $state = []

## Workflow
...

# After (v0.9)
---
name: my-skill
description: Does something

types:
  $MyType: /description/

input:
  $param: $String

context:
  $state: $String[] = []
---

## Workflow
...
```

### WITH Syntax Change

**Files affected:** Any file using `WITH:` blocks

**Migration pattern:**
```mdz
# Before (v0.8)
USE ~/skill/x TO /task/ WITH:
  - $param = value

# After (v0.9)
USE ~/skill/x TO /task/ WITH:
  param: value
```

### Add RETURN Statements

Opportunity to add explicit RETURN where appropriate for clarity.

## File-by-File Checklist

### Priority 1: Reference Implementation (already v0.9)
- [x] `examples/the-scientist/skill/map-reduce.mdz` — serves as reference

### Priority 2: PARALLEL FOR EACH Migration
- [ ] `multi-file-analyzer.mdz` — PARALLEL + frontmatter
- [ ] `doc-freshness-checker.mdz` — PARALLEL + frontmatter + WITH
- [ ] `adversarial-review.mdz` — PARALLEL + frontmatter + WITH
- [ ] `pre-mortem.mdz` — PARALLEL + frontmatter
- [ ] `brainstorm-parallel.mdz` — PARALLEL + frontmatter
- [ ] `pr-reviewer.mdz` — PARALLEL + frontmatter + multiple WITH

### Priority 3: Frontmatter Only
- [ ] `simplify.mdz` — frontmatter
- [ ] `steelmanning.mdz` — frontmatter
- [ ] `pr-reviewer/skill/learnings.mdz` — frontmatter
- [ ] `pr-reviewer/skill/review-format.mdz` — frontmatter
- [ ] `pr-reviewer/skill/code-analysis.mdz` — frontmatter
- [ ] `compiler-examples/skill/valid-skill.mdz` — frontmatter
- [ ] `compiler-examples/skill/missing-type.mdz` — frontmatter (keep intentional errors)
- [ ] `compiler-examples/skill/complex-system.mdz` — frontmatter + WITH

### No Changes Needed (11 files)
- Prose-only agents and skills
- Intentionally broken examples (keep for testing)

## Measures of Success

- [ ] All 18 files updated to v0.9 syntax
- [ ] `mdz check` passes on all examples
- [ ] map-reduce.mdz remains reference implementation

## Estimated Effort

4-6 hours
