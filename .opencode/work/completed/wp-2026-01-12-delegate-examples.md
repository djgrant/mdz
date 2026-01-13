# Create Example MDZ Files for DELEGATE Keyword

## Goal/Problem

Create example MDZ files that demonstrate the DELEGATE keyword for subagent delegation.

## Scope

- `examples/skills/orchestrator.mdz` (new)
- `examples/the-scientist/orchestrate.mdz` (update to use DELEGATE)
- Other example updates as appropriate

## Approach

### New Example: orchestrator.mdz

```mdz
---
name: orchestrator
description: When you need to coordinate multiple agents on a complex task
skills:
  - work-packages
agents:
  - general
  - explore
  - architect
  - critique
---

## Types

$AgentType: "general" | "explore" | "architect" | "critique"
$TaskResult: the outcome of a delegated task

## Input

- $problem: $String           <!-- the problem to solve -->
- $approach: $String = "iterative"

## Context

- $results: $TaskResult[] = []

## Workflow

1. Analyze the problem and determine which agents to involve

2. DELEGATE /initial exploration of the problem/ TO "explore"

3. FOR EACH $agent IN ["architect", "critique"]:
   - DELEGATE TO $agent:
     - $task = /review findings and provide $agent perspective/
     - $context = $results

4. IF /conflicting recommendations/ THEN:
   - DELEGATE /synthesize different viewpoints/ TO "general"

5. Compile final recommendations
```

### Update orchestrate.mdz

Update the existing orchestrate.mdz to use DELEGATE syntax where appropriate, showing the migration path.

### Additional Examples

Consider creating examples showing:
- DELEGATE inside PARALLEL FOR EACH (fan-out pattern)
- DELEGATE with error handling
- Chained delegation patterns

## Hypothesis

Concrete examples help users understand the new syntax and patterns.

## Results

### Files Created

1. **`examples/skills/orchestrator.mdz`** (new)
   - Demonstrates basic DELEGATE patterns
   - Shows `agents:` frontmatter field for declaring available agents
   - Covers simple delegation (`DELEGATE /task/ TO $agent`)
   - Covers parameterized delegation (`DELEGATE TO $agent:` with parameters)
   - Documents when to use DELEGATE vs Execute [[skill]]

2. **`examples/skills/parallel-delegation.mdz`** (new)
   - Demonstrates DELEGATE inside PARALLEL FOR EACH
   - Shows fan-out patterns for concurrent agent work
   - Includes patterns section with common delegation idioms
   - Includes anti-patterns section with guidance on when NOT to use parallel

3. **`examples/the-scientist/orchestrate.mdz`** (updated)
   - Added "Delegation Patterns" section at the end
   - Shows simple, parameterized, and parallel delegation syntax
   - Clarifies distinction between DELEGATE and Execute [[skill]]

### DELEGATE Syntax Forms Demonstrated

- `DELEGATE /task description/ TO "agent-name"` - simple form
- `DELEGATE /task/ TO $agentVariable` - with variable agent
- `DELEGATE TO $agent:` with parameter block - complex form
- `PARALLEL FOR EACH` + `DELEGATE` - fan-out pattern

## Evaluation

Examples are syntactically valid based on current MDZ spec patterns. The DELEGATE keyword follows the same CAPS convention as other control flow keywords (FOR EACH, WHILE, IF THEN).

Note: The `agents:` frontmatter field shown in examples is not yet supported by the parser (produces TypeScript diagnostic). This is expected as the parser needs to be updated to support agent declarations.
