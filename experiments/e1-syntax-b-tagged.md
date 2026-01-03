---
name: orchestrate-map-reduce
description: When you need multiple operations to get one solution, use this orchestration strategy to fan out to multiple agents, validate their solutions and find a winning solution.
---

{% types %}
Task = any task that an agent can execute
Strategy = "accumulate" | "independent"
{% /types %}

{% inputs %}
transforms: (Task, Strategy)[]
validator: Task
return: Task
{% /inputs %}

# Map-Reduce Workflow

1. Create master work package
2. Delegate to sub-agent: summarise the status quo solution and write it to {% var current /%}

{% for ($task, $strategy) in $transforms %}
3. Delegate to sub-agent: {% render section="iteration-manager-prompt" strategy={$strategy} task={$task} validator={$strategy == "accumulate" ? $validator : null} /%}
{% /for %}

4. Collect findings from each iteration manager
5. Update master work package
6. Run the return task

## Iteration Manager Prompt {% #iteration-manager-prompt %}

You are responsible for mapping over Task until it passes Validator.

### Reference

- Strategy: {% var strategy /%}
- Task: {% var task /%}
- Validator: {% var validator /%}

### Context

{% assign SolutionPath = ($n) => `${semantic("relevant wp path")}-candidate-${$n}.md` /%}
{% assign current = SolutionPath(0) /%}
{% assign next = SolutionPath(1) /%}

### Workflow

1. Create a work package

{% while condition="not diminishing_returns and iterations < 5" %}
2. Delegate to sub-agent with {% ref section="build-prompt" /%}

{% if condition="strategy == 'accumulate'" %}
   - Delegate to sub-agent {% ref section="validate-prompt" /%}
   {% if condition="pass" %}
   - Update work package
   - {% assign current = next /%}
   - {% assign next = SolutionPath(iteration + 1) /%}
   {% /if %}
{% /if %}
{% /while %}

{% if condition="strategy == 'accumulate'" %}
3. Return findings
{% else %}
3. Delegate to sub-agent {% ref section="validate-all-prompt" /%}
   Return findings
{% /if %}
