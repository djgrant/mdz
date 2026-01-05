---
size: sm
category: language
parent: wp-p1-language-coherence-master
---

# Interface Parameter Syntax

## Goal/Problem

Input parameters currently use `=` which looks like assignment:

```mdz
## Input
- $problem: $String = the problem to solve
```

This is confusing because:
1. It looks like `the problem to solve` is being assigned
2. It's actually a description/default for the interface
3. Interfaces shouldn't have assignments

## Constraint

The `~~` semantic marker is NOT appropriate here because the LLM isn't being asked to infer anything - this is a description of what the parameter represents.

## Proposed Options

### Option A: `$Type(description)` syntax
```mdz
## Input
- $problem: $String(the problem to solve)
- $maxIterations: $Number(5)
- $strategy: $Strategy("accumulate")
```

Pros: Type and description together, no assignment confusion
Cons: Parens overloaded (also used for tuples, function calls)

### Option B: Description after type, no assignment
```mdz
## Input
- $problem: $String — the problem to solve
- $maxIterations: $Number — defaults to 5
```

Pros: Clear separation, em-dash common in documentation
Cons: How to specify actual defaults?

### Option C: Separate default from description
```mdz
## Input
- $problem: $String  # the problem to solve
- $maxIterations: $Number = 5
- $strategy: $Strategy = "accumulate"
```

Pros: Comments for descriptions, `=` only for literal defaults
Cons: Loses structured description

### Option D: Interface block syntax
```mdz
## Input

$problem: $String
  The problem to solve
  
$maxIterations: $Number = 5
  Maximum iterations before stopping
```

Pros: Rich documentation possible
Cons: More complex parsing, different from current list style

### Option E: Only allow literal defaults
```mdz
## Input
- $problem: $String
- $maxIterations: $Number = 5
- $strategy: $Strategy = "accumulate"
```

Where `the problem to solve` was never valid - only literal values allowed.

Pros: Simple, unambiguous
Cons: Loses descriptive defaults

## Questions to Explore

1. What are input parameters actually for? (LLM interface? Human docs? Both?)
2. Should descriptions be structured or just comments?
3. How do other IDLs handle this? (protobuf, GraphQL, OpenAPI)
4. What does the parser currently accept?

## Approach

1. Clarify the purpose of Input section
2. Audit what's currently in examples
3. Research interface definition patterns
4. Propose syntax that separates concerns clearly

## Decision

**Implemented Option E with inline comments.**

After analysis of current usage, parser behavior, and IDL conventions, the decision is:

1. **`=` is reserved for literal default values only** - No prose descriptions after `=`
2. **`#` comments for documentation** - Familiar from YAML, Python, shell
3. **Parameters without `=` are required** - Clear distinction

This aligns with how every other IDL handles this (Protobuf, GraphQL, OpenAPI, TypeScript).

## Results

### Analysis Findings

**Current examples mixed three patterns:**
1. Prose descriptions as values: `$problem: $String = the problem to solve` (confusing)
2. Literal defaults: `$maxIterations: $Number = 5` (correct)
3. No default (required): `$prType: $PRType` (correct)

**What parser actually does:** After `=`, the parser calls `parseExpression()` which parses prose as `InlineText` - not even a string literal. This means `the problem to solve` was being parsed as expression text, not a structured description.

**How other IDLs handle this:**
- Protobuf: Comments only (`// description`)
- GraphQL: Separate description strings (`"""description"""`)
- OpenAPI: Separate `description:` and `default:` fields
- TypeScript: JSDoc comments (`/** description */`)

None of them mix descriptions with default values.

### Changes Made

1. **Updated all examples** (`examples/*.mdz`):
   ```mdz
   # Before (confusing)
   - $problem: $String = the problem to solve
   
   # After (clear)
   - $problem: $String                    # the problem to solve
   ```

2. **Updated language-spec.md**: Added "Input Section Semantics" section clarifying:
   - `=` ONLY for literal values
   - `#` comments for descriptions
   - Valid default value types

3. **Updated grammar.md**:
   - Added `line_comment` production
   - Added `input_param` rule for Input sections
   - Added note about `=` being reserved for literal defaults

### Files Changed

- `examples/debugger.mdz` - Fixed 1 parameter
- `examples/pr-reviewer.mdz` - Fixed 1 parameter
- `examples/skill-composer.mdz` - Fixed 2 parameters
- `examples/the-scientist.mdz` - Fixed 1 parameter
- `spec/language-spec.md` - Added Input Section Semantics section
- `spec/grammar.md` - Added input_param rule and line_comment

## Evaluation

**Is the interface syntax clear and unambiguous?** ✅ Yes.

- `=` now unambiguously means "literal default value"
- Comments (`#`) clearly indicate documentation
- No parser changes needed - just clearer conventions
- All tests pass
- Aligns with established IDL patterns
