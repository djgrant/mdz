---
name: orchestrate-map-reduce
description: When you need multiple operations to get one solution, use this orchestration strategy to fan out to multiple agents, validate their solutions and find a winning solution.
uses:
  - work-packages
  - orchestrate
---

## Types

$Task = any task that an agent can execute (instructions, tool call, or other)
$Strategy = "accumulate" | "independent"
$ValidationResult = "progress" | "regression" | "plateau"

## Input

- $transforms: ($Task, $Strategy)[]
- $validator: $Task
- $return: $Task

## Context

- $SolutionPath = $n => `{~~relevant wp path}-candidate-{$n}.md`
- $current: $FilePath = $SolutionPath(0)
- $next: $FilePath = $SolutionPath(1)
- $iterations: $Number = 0

## Map-Reduce Workflow

### Phase 1: Setup

1. Create master work package at {~~appropriate location for this task}

2. Delegate to sub-agent:
   > Summarize the status quo solution and write it to $current

### Phase 2: Map

3. FOR EACH ($task, $strategy) IN $transforms:
   - Delegate to sub-agent with [[#iteration-manager]] passing:
     - task: $task
     - strategy: $strategy
     - validator: $validator IF $strategy = "accumulate"

### Phase 3: Reduce

4. Collect findings from each iteration manager

5. Update master work package with aggregated results

6. Execute $return task

---

## Iteration Manager

You are responsible for executing $task iteratively until it passes $validator.

### Your Context

- Task: $task
- Strategy: $strategy
- Validator: $validator (if accumulate strategy)

### Your Workflow

1. Create iteration work package

2. WHILE (not diminishing returns AND $iterations < 5):
   - Delegate to sub-agent with [[#build-prompt]]
   
   - IF $strategy = "accumulate" THEN:
     - Delegate validation to [[#validate-prompt]]
     - IF $result = "progress" THEN:
       - Update work package with improvement
       - $current = $next
       - $next = $SolutionPath($iterations + 1)
     - IF $result = "regression" THEN:
       - Revert to previous $current
       - Try different approach
     - IF $result = "plateau" THEN:
       - Note diminishing returns

3. IF $strategy = "accumulate" THEN:
   - Return findings from accumulated improvements
   ELSE:
   - Delegate [[#validate-all-prompt]] to compare all candidates
   - Return best candidate

---

## Build Prompt

Execute the following task:

**Task**: $task

**Current solution**: $current
**Write improved solution to**: $next

{~~Additional context relevant to the task}

---

## Validate Prompt

Validate this solution against the criteria.

**Solution at**: $next
**Validator**: $validator

Return one of:
- **progress**: Solution is better and meets criteria
- **regression**: Solution broke something
- **plateau**: No meaningful change

---

## Validate All Prompt

Compare all candidate solutions and select the best.

**Candidates**: $SolutionPath(0) through $SolutionPath($iterations)
**Criteria**: $validator

Return: The path to the best candidate and why.
