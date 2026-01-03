# Genesis: A Component-Based Architecture for Multi-Agent Systems

## Goal/Problem

Build a system for building agent systems that has a composable, declarative nature with validation and tooling support.

The core insight: agents are acting as turing machines. We need a markdown extension language with primitives that support defining their runtime behaviour, and an ecosystem of tools for understanding this new type of code.

## Origin

This vision emerged from observing patterns in [the-scientist](https://github.com/djgrant/the-scientist) (see `simplify` branch), an OpenCode config pack for multi-agent orchestration.

Note: All of the following is highly experimental.

### Examples from the-scientist

**1. Base skill with methodology**

The `orchestrate` skill defines the base methodology for orchestration:

```markdown
---
name: orchestrate
description: When you are running any orchestration operation, load this skill first to understand the core methodology using sub-agents and work packages.
---

Orchestration enables you to track and delegate sub-tasks effectively. 

## What You Do

Commission and track work packages, evaluate results, and act executively on findings.

## Methodology

Any orchestration strategy requires you to:

1. Understand the requirements
2. Define measures of success
3. Choose an orchestration strategy (project, map-reduce or ad-hoc), if not already specified
4. Create a master work package
5. Delegate creation and completion of work packages to sub-agents
6. Delegate testing of solutions to separate sub-agents
7. Commission up to five iterations of each work package
8. Update the master work package after each iteration
9. Revise your strategy and commission new work packages dynamically when needed
10. Report the results
```

**2. Higher-order skill demonstrating composition patterns**

The `orchestrate-map-reduce` skill shows several advanced patterns:

```markdown
---
name: orchestrate-map-reduce
description: When you need multiple operations to get one solution, use this orchestration strategy to fan out to multiple agents, validate their solutions and find a winning solution.
---

## Types

$Task = any task that an agent can execute (can be a set of instruction, tool call or something else)
$Strategy = accumulate or independent execution (default: accumulate)

## Input

- $transforms: ($Task, $Strategy)
- $validator: $Task
- $return: $Task

### Choosing a Strategy
- **Accumulate**: When the aim is to progressively work toward the best solution
- **Independent**: When the aim is review a diverse set of candidates (can be run in parallel; each prompt should be a variant of $transforms($n))

## Map-Reduce Workflow

1. Create master work package
2. Delegate to sub-agent: summarise the status quo solution and write it to $current
3. FOR EACH $task IN $transforms:
  - Delegate to sub-agent: RENDER(#iteration-manager-prompt WITH ($strategy, $task, $validator IF strategy == accumulate))
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
2. WHILE (not diminishing returns AND $iterations < 5)
  - Delegate to sub-agent with #build-prompt
{{IF (strategy == accumulate) THEN}}
  - delegate to sub-agent #validate-prompt
  - IF (pass) THEN update work package; ELSE continue
  - IF (pass) $current = $next; $next = $SolutionPath($iteration + 1)
3. Return findings
{{ELSE}}
3.  delegate to sub-agent #validate-all-prompt
4. Return findings
{{END}}
```

**3. Skill that uses another skill**

The `simplify` skill references `orchestrate-map-reduce` in its description (for loading order) and uses it in its workflow:

```markdown
---
name: simplify
description: When a solution (code, architecture, docs etc.) needs to be simplifed, use this skill with orchestrate-map-reduce to find its essence.
---

## Workflow

1. Scope
  - Identify what to simplify 
  - Define what must be preserved 
  - Define validator (determines if the solution is still viable)
  - Determine which heuristics to use
  - Determine which map-reduce strategy to use for each heuristic (accumulate if not sure)
2. Confirm plan with user
3. Execute orchestrate-map-reduce with:
  - transforms = (simplification heuristic, strategy)[]
  - validator = validator
  - return = "Present findings to the user"

## Simplification Heuristics

1. Subtractive Iteration
   > "Remove one element/layer/abstraction. The solution must still satisfy: {essence_criteria}. What single thing can be removed?"

2. Constraint Forcing
   > "Reimplement this using only {N} {units}. What would you keep? What creative alternatives replace what you removed?"

## Validation Interface

After each iteration determine: 
- **progress** (simpler + essence intact)
- **regression** (essence broken)
- **plateau** (no change)
```

**4. Work packages as persistence medium**

Work packages provide context and state across agent sessions:

```markdown
# {Title}

## Goal/Problem
{What is the goal or problem that needs to be solved}

## Scope  
{Which files/packages this touches}

## Approach
{How to do it}

## Hypothesis
{How and why do you think this will work}

## Results
{To be filled out upon completion. Can contain multiple iterations.}

## Evaluation
{What did your learn from the results? Was the hypothesis proved correct?}
```

### Patterns Observed

These examples demonstrate several patterns that a language should express:

**Interfaces**
- `## Types` section defining `$Task`, `$Strategy`
- `## Input` section specifying parameters with types: `$transforms: ($Task, $Strategy)`
- `## Validation Interface` section defining output contract: `progress | regression | plateau`

**References between skills**
- Description field used for loading order: `"use this skill with orchestrate-map-reduce"`
- Skills referencing other skills for composition

**Input parameter types**
- Typed parameters: `$validator: $Task`
- Compound types: `($Task, $Strategy)`

**Context via work packages**
- `$current`, `$next` as stateful references
- Work package as the persistence medium between agent invocations

**Lambdas**
- `$SolutionPath = $n => \`{~~relevant wp path}-candidate-{$n}.md\``

**Control flow expressions**
- `FOR EACH $task IN $transforms`
- `WHILE (not diminishing returns AND $iterations < 5)`
- `{{IF (strategy == accumulate) THEN}} ... {{ELSE}} ... {{END}}`

**Semantic interpretation symbols**
- `~~relevant wp path` - the `~~` signals "interpret this semantically"

**Implied markdown anchors**
- `#iteration-manager-prompt` references `### Iteration Manager Prompt` heading
- `#build-prompt`, `#validate-prompt` reference sections within the same document
- Enables internal linking without explicit anchor definitions

**Skill description pattern**
- When: `"When you need multiple operations to get one solution"`
- Does: `"fan out to multiple agents, validate their solutions"`
- Uses: `"use this skill with orchestrate-map-reduce"`

## Vision

### 1. Markdown Extension Language

A markdown extension that can express:

- **Interfaces** - Define types, inputs, outputs for skills/agents
- **References** - Link between skills with autocomplete support
- **Input parameter types** - Typed parameters for skills
- **Context** - Work packages as persistence medium
- **Lambdas** - Inline function definitions
- **Control flow** - Conditionals, loops, iteration with termination
- **Semantic symbols** - Operators like `~~` for "interpret semantically"
- **Skill description pattern** - Structured syntax for when/does/uses

This is a new type of code. It needs to be understood as code.

### 2. Ecosystem Tools

**Macros**
- Reusable patterns that expand at compile time
- Abstract common orchestration patterns

**Precompile Steps**
- Transform source format into LLM-friendly output
- Expand templates, inline references
- Source format (what you author) differs from compiled format (what LLM sees)

**Compile-Time Analysis**
- Check logic consistency
- Simulate scenarios with different inputs
- Review what final prompt the LLM sees when different skills are loaded
- Validate references (does skill X exist? autocomplete support)
- Detect cycles, unreachable branches, missing termination conditions

**Runtime Analysis**
- Trace execution through agent delegations
- Debug work package state transitions
- Inspect what prompts were actually sent

**Benchmark Suite**
- Test agent systems against scenarios
- Measure behaviour consistency
- Regression testing for prompt changes

## Scope

This work package defines the vision only. Implementation details, specific syntax choices, and architecture decisions are out of scope.

## Approach

TBD - requires further exploration and design work.

## Hypothesis

A markdown extension language with proper tooling will:
- Reduce cognitive burden of building multi-agent systems
- Outperform other approaches to agent orchestration
- Unlock a new mental model that fits LLMs better

## Results

N/A - Genesis document.

## Evaluation

N/A - Genesis document.
