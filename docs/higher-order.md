# Higher-Order Skills

Skills that compose and orchestrate other skills--like higher-order functions, but for agent workflows.

## What are Higher-Order Skills?

A higher-order skill doesn't just perform a task--it orchestrates other skills to accomplish complex, multi-step objectives. Just as higher-order functions take functions as arguments and return functions, higher-order skills take skills as dependencies and coordinate their execution.

These skills typically:

- Link to multiple skills for delegation
- Define iteration or branching logic to coordinate execution
- Manage state across multiple sub-skill invocations
- Synthesize results from delegated work

## Patterns

### Map-Reduce

Fan out work to multiple agents, collect results, and synthesize a final output:

<!-- mdz-snippet: docs/snippets/higher-order/map-reduce.mdz -->

This pattern excels when work can be parallelized and results need aggregation.

### Iteration with Hypothesis Testing

Loop until a condition is met, refining approach based on observations:

<!-- mdz-snippet: docs/snippets/higher-order/hypothesis-loop.mdz -->

This pattern is ideal for problems requiring exploration and adaptation.

### Pipeline

Sequential skill chaining where output flows from one stage to the next:

<!-- mdz-snippet: docs/snippets/higher-order/pipeline.mdz -->

Use this when each step transforms data for the next stage.

## Example: The Scientist

The `scientific-method.mdz` skill demonstrates a sophisticated higher-order pattern for hypothesis-driven iteration. It orchestrates sub-agents to run experiments and refine solutions based on observations.

### Structure

<!-- mdz-snippet: docs/snippets/higher-order/scientific-method-frontmatter.mdz -->

### State Persistence with Work Packages

The scientist uses `~/skill/work-packages` to persist state across iterations:

- A master work package tracks overall progress and findings
- Each experiment gets its own work package at a computed path
- Results are recorded for later synthesis

<!-- mdz-snippet: docs/snippets/higher-order/work-package-path.mdz -->

### The WHILE Loop

The core iteration continues until diminishing returns or max iterations:

<!-- mdz-snippet: docs/snippets/higher-order/scientific-loop.mdz -->

### Result Accumulation

The skill supports two strategies via `$strategy`:

- **accumulate**: Commit successful changes and build on them
- **independent**: Run experiments independently, synthesize at the end

The final conclusion synthesizes all findings, documenting what worked and what didn't.

## Structure of a Higher-Order Skill

A typical higher-order skill follows this structure:

<!-- mdz-snippet: docs/snippets/higher-order/higher-order-structure.mdz -->

## Key Techniques

- **Link to dependencies**: Reference all orchestrated skills and agents
- **Define iteration variables**: Track state in the Context section
- **Use work packages**: Persist state for complex, multi-step workflows
- **Create sub-agent prompts**: Define reusable prompt sections for delegation
- **Handle failure modes**: Include branching logic for different outcomes

## See Also

- [Composition](/docs/composition) -- Links and delegation
- [Control Flow](/docs/control-flow) -- WHILE, FOR, IF/THEN/ELSE, END
- [Examples](/examples) -- Full implementations including scientific-method
