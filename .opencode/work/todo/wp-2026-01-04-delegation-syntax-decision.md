# Delegation Syntax Decision

## Goal/Problem

The grammar audit identified a mismatch: formal delegation syntax is specified but never implemented.

**Reference:** See findings in `.opencode/work/completed/wp-2026-01-04-grammar-audit.md`

## The Issue

The spec defines:
```
Execute [[skill]] WITH:
  - $param: $Type = value
  - $required: $Task
```

But:
- Parser has no `parseDelegation` or `parseWithClause` methods
- AST `Delegation` type is defined but never instantiated
- `WITH` token is lexed but never parsed
- All examples use informal prose patterns instead

## Options

### Option A: Remove from Spec
Accept that delegation is prose-based. The LLM interprets natural language delegation.

**Changes:**
- Remove `Delegation` AST type
- Remove `WITH` token from lexer
- Remove delegation grammar from spec
- Document that delegation is intentionally informal

**Pros:** Simplifies grammar, matches reality, less maintenance
**Cons:** Loses potential for validation of delegation calls

### Option B: Implement Fully
Add delegation parsing to recognize and validate the pattern.

**Changes:**
- Implement `parseDelegation()` in parser
- Validate parameters against target skill interface
- Add examples showing formal delegation

**Pros:** Enables contract checking at call sites, catches errors
**Cons:** More complex grammar, may feel over-engineered

### Option C: Lightweight Recognition
Parse delegation for metadata extraction only, don't validate.

**Changes:**
- Recognize `Execute [[ref]] WITH:` pattern
- Extract for dependency graph
- Don't validate parameters

**Pros:** Middle ground, useful for tooling
**Cons:** Half-measure, may confuse users

## Recommendation

{To be filled after discussion with @djgrant}

## Decision

⚠️ **REQUIRES HUMAN INPUT** - Present options and wait for decision before implementing.

## Results

{To be filled out upon completion}

## Evaluation

{Did the chosen approach work well?}
