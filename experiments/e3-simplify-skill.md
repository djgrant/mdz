---
name: simplify
description: When a solution (code, architecture, docs etc.) needs to be simplified, use this skill with orchestrate-map-reduce to find its essence.
uses:
  - orchestrate-map-reduce
---

## Types

$EssenceCriteria = what must be preserved when simplifying
$SimplificationResult = the simplified solution with validation status
$Target = the thing to be simplified (code, architecture, docs, etc.)

## Input

- $target: $Target
- $essence: $EssenceCriteria
- $strategy: $Strategy = "accumulate"

## Workflow

### Phase 1: Scope

1. Identify what aspects of $target can be simplified
2. Define validation criteria: {~~a check that essence is preserved}
3. Select simplification heuristics based on $target type

### Phase 2: Confirm

1. Present plan to user:
   - Target: $target
   - Essence to preserve: $essence
   - Heuristics to apply: [[#simplification-heuristics]]
   - Strategy: $strategy

2. Wait for user confirmation

### Phase 3: Execute

1. Execute [[orchestrate-map-reduce]] WITH:
   - $transforms = [
       ("Apply subtractive iteration", $strategy),
       ("Apply constraint forcing", $strategy)
     ]
   - $validator = [[#validate-essence]]
   - $return = "Present findings to the user"

### Phase 4: Report

1. Present findings from [[orchestrate-map-reduce]]
2. Show before/after comparison
3. Highlight what was removed vs preserved

---

## Simplification Heuristics

### Subtractive Iteration

> "Remove one element/layer/abstraction. The solution must still satisfy: {$essence}. What single thing can be removed?"

FOR EACH $iteration IN range(1, 5):
  - Identify the least essential component
  - Remove it
  - IF [[#validate-essence]] returns "progress" THEN:
    - Continue with reduced solution
  - ELSE:
    - Restore and try different component

### Constraint Forcing

> "Reimplement this using only {~~half the current size/complexity}. What would you keep? What creative alternatives replace what you removed?"

1. Measure current complexity of $target
2. Set constraint = complexity / 2
3. Force reimplementation within constraint
4. Validate with [[#validate-essence]]

---

## Validate Essence

Given $result and $essence:

1. Check: Does $result still satisfy $essence criteria?
2. Return:
   - **progress**: simpler AND essence intact
   - **regression**: essence broken
   - **plateau**: no change in simplicity
