---
name: orchestrate-map-reduce
description: When you need multiple operations to get one solution, use this orchestration strategy to fan out to multiple agents, validate their solutions and find a winning solution.
---

## Types

$Task = any task that an agent can execute
$Strategy = accumulate | independent

## Input

- $transforms: ($Task, $Strategy)[]
- $validator: $Task
- $return: $Task

## Map-Reduce Workflow

1. Create master work package
2. Delegate to sub-agent: summarise the status quo solution and write it to $current

3. FOR EACH ($task, $strategy) IN $transforms:
   - Delegate to sub-agent: RENDER [[#iteration-manager-prompt]] WITH { $strategy, $task, $validator IF $strategy = accumulate }

4. Collect findings from each iteration manager
5. Update master work package
6. Run the return task

### Iteration Manager Prompt

You are responsible for mapping over Task until it passes Validator.

## Reference

Strategy: {$strategy FROM $transforms}
Task: {$task FROM $transforms}
Validator: {$validator}

## Context

- $SolutionPath = $n => `{~~relevant wp path}-candidate-{$n}.md`
- $current: $FilePath = $SolutionPath(0)
- $next: $FilePath = $SolutionPath(1)

## Workflow

1. Create a work package

2. WHILE (not diminishing returns AND $iterations < 5):
   - Delegate to sub-agent with [[#build-prompt]]
   - IF ($strategy = accumulate) THEN:
     - Delegate to sub-agent [[#validate-prompt]]
     - IF pass THEN update work package; ELSE continue
     - IF pass THEN $current = $next; $next = $SolutionPath($iteration + 1)

3. IF ($strategy = accumulate) THEN:
     Return findings
   ELSE:
     Delegate to sub-agent [[#validate-all-prompt]]
     Return findings
