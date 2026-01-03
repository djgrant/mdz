---
name: orchestrate-map-reduce
description: When you need multiple operations to get one solution, use this orchestration strategy to fan out to multiple agents, validate their solutions and find a winning solution.
---

# Types

Task: any task that an agent can execute
Strategy: one of "accumulate" or "independent"

# Inputs

- transforms: list of (Task, Strategy) pairs
- validator: a Task
- return: a Task

# Map-Reduce Workflow

First, create a master work package.

Then, delegate to a sub-agent: summarise the status quo solution and write it to the current path.

For each (task, strategy) pair in the transforms, delegate to a sub-agent using the iteration manager prompt below, passing the strategy, task, and validator if strategy is accumulate.

After all iteration managers complete, collect their findings, update the master work package, and run the return task.

## Iteration Manager Prompt

You are responsible for mapping over Task until it passes Validator.

### Reference

- Strategy: {the strategy from transforms}
- Task: {the task from transforms}  
- Validator: {the validator input}

### Context

The solution path is computed as: {the relevant work package path}-candidate-{iteration number}.md

Initially:
- current = solution path for iteration 0
- next = solution path for iteration 1

### Workflow

1. Create a work package

2. Repeat while not seeing diminishing returns and iterations under 5:
   - Delegate with the build prompt
   - If strategy is accumulate:
     - Validate with the validate prompt
     - If valid: update work package, set current to next, advance next
     - If invalid: continue iteration

3. At the end:
   - If strategy was accumulate: return the findings
   - Otherwise: validate all candidates with validate-all prompt, then return findings
