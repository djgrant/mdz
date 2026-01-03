---
name: skill-composer
description: When composing multiple skills into a coordinated workflow
uses:
  - orchestrate
  - work-packages
  - the-scientist
---

## Types

$SkillRef = reference to another skill
$CompositionMode = "sequential" | "parallel" | "conditional"
$DependencyGraph = directed graph of skill dependencies
$ExecutionPlan = ordered list of skill executions

## Input

- $skills: $SkillRef[] = skills to compose
- $mode: $CompositionMode = "sequential"
- $entryPoint: $SkillRef = first skill to execute

## Context

- $graph: $DependencyGraph
- $plan: $ExecutionPlan
- $results: ($SkillRef, $String)[] = []
- $currentSkill: $SkillRef

## Workflow

### 1. Analyze Dependencies

1. FOR EACH $skill IN $skills:
   - Load skill source
   - Extract `uses` from frontmatter
   - Add edges to $graph
   
2. Detect cycles in $graph
   IF {~~cycle detected} THEN:
     - Report circular dependency error
     - Abort composition
   
3. Topological sort to create $plan

### 2. Validate Composition

FOR EACH $skill IN $plan:
  - Verify all dependencies are satisfied
  - Check for type compatibility between skills
  - IF {~~incompatible interface} THEN:
    - Log warning with suggested adaptations

### 3. Execute Composition

IF $mode = "sequential" THEN:
  - FOR EACH $skill IN $plan:
    - Execute $skill with results from dependencies
    - Store result in $results
    - IF {~~execution failed} THEN:
      - Attempt recovery using [[#recovery-strategy]]

ELSE:
  IF $mode = "parallel" THEN:
    - Group $plan into parallel batches (same level in DAG)
    - FOR EACH $batch IN $batches:
      - Execute all skills in $batch concurrently
      - Wait for all to complete
      - Merge results
  ELSE:
    - Execute based on runtime conditions
    - Branch execution path based on intermediate results

### 4. Synthesize Results

1. Collect all outputs from $results
2. Resolve any conflicts using {~~conflict resolution strategy}
3. Generate unified output combining skill contributions
4. Report composition summary:
   - Skills executed
   - Execution order
   - Results synthesis

## Recovery Strategy

When a skill execution fails:

1. Analyze the failure mode
2. Check if dependent skills can proceed without this result
3. IF recoverable THEN:
   - Use fallback value
   - Log degraded operation warning
4. ELSE:
   - Propagate failure to dependent skills
   - Mark composition as partial failure
