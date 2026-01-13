# MDZ v0.10 Type Constraints

## Goal

Investigate and implement stronger type constraints for MDZ, particularly around link types (agents, skills, tools).

## Background

v0.9 allows flexible DELEGATE targets but doesn't enforce that the target is actually an agent. Currently type checking infers agent-ness from folder convention (`~/agent/x`) or variable assignment, but this is loose.

## Questions to Explore

1. **How to define agent/skill/tool types?**
   - Built-in types: `$Agent`, `$Skill`, `$Tool`
   - Parameterized link type: `$Link<agent>`
   - Inferred from path convention only

2. **What constraints should be enforced?**
   - `DELEGATE TO` target must be agent
   - `USE` target must be skill
   - `EXECUTE` target must be tool
   - WITH params match target's input signature?

3. **How strict?**
   - Errors (block execution)
   - Warnings (informational)
   - Hints (IDE only)

4. **Variable type inference:**
   - `$worker = ~/agent/x` → infer `$worker: $Agent`
   - Reassignment to different type = error?

5. **Cross-skill type checking:**
   - Can we validate that passed params match the target skill's input?
   - Requires loading and parsing dependencies

## Out of Scope

- Runtime type enforcement (MDZ is LLM-interpreted)
- Complex generic types beyond `$Link<T>`

## Measures of Success

1. Clear spec for link type semantics
2. Compiler warnings for type mismatches
3. LSP provides type-aware completions

## Progress Log

### 2026-01-13

- Work package created to explore type constraints separately from v0.9 syntax changes
